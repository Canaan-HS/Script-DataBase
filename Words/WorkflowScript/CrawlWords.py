import os
import json
from pathlib import Path

import httpx
import opencc
import markdown
from bs4 import BeautifulSoup

os.chdir(Path(__file__).parent)


class WordCrawl:
    def __init__(self):
        self.client = httpx.Client(http2=True)
        self.cn_tw = opencc.OpenCC("s2twp")
        self.get_exist_words = lambda: self.read_local_json(
            "../All_Words.json"
        ) | self.read_local_json("../Exclude.json")

    # 讀取本地 JSON
    def read_local_json(self, json_path) -> dict:
        json_path = Path(json_path)
        try:
            return (
                json.loads(json_path.read_text(encoding="utf-8"))
                if json_path.exists()
                else {}
            )
        except:
            return {}

    # 解析後輸出 Json
    def parse_write_json(self, word_dict):
        review = {}
        allowed = {}

        for name, data in word_dict.items():
            for key, value in data.items():
                if "|" in value:
                    review[key] = value
                else:
                    allowed[key] = value

            if allowed:
                Path("allow").mkdir(exist_ok=True)
                Path(f"allow/{name}.json").write_text(
                    json.dumps(
                        allowed, indent=4, separators=(",", ":"), ensure_ascii=False
                    ),
                    encoding="utf-8",
                )

            if review:
                Path("review").mkdir(exist_ok=True)
                Path(f"review/{name}.json").write_text(
                    json.dumps(
                        review, indent=4, separators=(",", ":"), ensure_ascii=False
                    ),
                    encoding="utf-8",
                )

    # 讀取遠端縮需要的資料
    def __extract_table_rows(self, word_type, soup) -> dict:
        return {
            key: (value if word_type == "Group" else self.cn_tw.convert(value))
            for tr in soup.select("table tr:has(td + td)")
            if (
                cells := [
                    td.get_text().strip()
                    for td in tr.select("td:nth-child(1), td:nth-child(2)")
                ]
            )
            and len(cells) >= 2
            and (key := cells[0])
            and (value := cells[1])
            and not key.isdigit()  # 排除 key 都是數字
            and len(key) > 2  # 排除 key 長度小於等於 2
            and key.lower() != value.lower()  # 排除 key 和 value 相同
            and (value := value.replace(" | ", "|"))
        }

    # 爬取遠端數據
    def get_remote_words(self, word_type) -> dict:
        uri = f"https://raw.githubusercontent.com/EhTagTranslation/Database/refs/heads/master/database/{word_type}.md"
        response = self.client.get(uri)

        if response.status_code == 200:
            html = markdown.markdown(
                response.text,
                extensions=[
                    "markdown.extensions.extra",  # 包括表格、腳註等
                    "markdown.extensions.codehilite",  # 代碼高亮
                    "markdown.extensions.toc",  # 目錄生成
                    "markdown.extensions.smarty",  # 智能標點符號
                ],
            )

            return self.__extract_table_rows(
                word_type, BeautifulSoup(html, "html.parser")
            )

    def start(self, data: object):
        exist_words = self.get_exist_words()  # 讀取本地數據

        for item in data:
            remote_words = {}
            name = item["Name"]

            for uri in item["Uri"]:
                remote_words |= self.get_remote_words(uri)

            # 找到不包含在, 已經存在的字典
            new_words = {
                k: remote_words[k] for k in remote_words.keys() - exist_words.keys()
            }
            self.parse_write_json({name: new_words})


if __name__ == "__main__":
    WC = WordCrawl()
    WC.start(
        [
            {"Name": "Character", "Uri": ["character"]},
            {"Name": "Parody", "Uri": ["parody"]},
            {"Name": "Group", "Uri": ["group"]},
            {"Name": "Tags", "Uri": ["other", "mixed", "male", "female"]},
        ]
    )
