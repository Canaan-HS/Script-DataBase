import path from "path";
import { fileURLToPath } from "url";
process.chdir(path.dirname(fileURLToPath(import.meta.url)));

import {ReadWords, GenerateWords} from "./!RG.mjs";

/**
 * 解析 Csv 數據轉換成 Json 輸出, Data 需要傳遞 array
 */
async function CsvToJson(Data) {
    let Read_Data = "";

    for (const Path of Data) { // 讀出來的是字串, 將所有字串合併
        Read_Data += await ReadWords(`${Path}.csv`, false);
    };

    const ParseBox = {};
    for (const str of Read_Data.split("\r\n")) {
        for (const str1 of str.replace(/"/g, "").split(",")) {
            if (/^\d+$/.test(str1)) continue;
            ParseBox[str1.replace(/_/g, " ")] = "";
        }
    }

    GenerateWords(ParseBox, "Csv.json");
}

/**
 * 這兩個函數是用於爬取數據, 轉換成簡單格式的 json
 * (這裡是用不了的)
 */
function OuputJson(Data) {
    const Json = document.createElement("a");
    const Name = document.querySelector("h1#sticky-file-name-id").textContent.replace(".md", "");
    Json.href = `data:application/json;charset=utf-8,${encodeURIComponent(Data)}`;
    Json.download = `${Name}.json`;
    Json.click();
    setTimeout(()=> {Json.remove()}, 1e3);
};

function DataCrawling() {
    const dict = {};
    document.querySelectorAll("article.markdown-body table")[3].querySelectorAll("tbody tr").forEach(tr=> {
        const td = tr.querySelectorAll("td");
        const [key, value] = [td[0].textContent, td[1].textContent];
        if (key && value) dict[key] = value;
    });
    OuputJson(JSON.stringify(dict, null, 2));
};