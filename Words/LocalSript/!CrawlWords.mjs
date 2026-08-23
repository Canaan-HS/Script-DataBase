import path from 'path';
import { fileURLToPath } from 'url';
process.chdir(path.dirname(fileURLToPath(import.meta.url)));

import axios from 'axios';
import * as marked from 'marked';
import * as cheerio from 'cheerio';
import * as OpenCC from "opencc-js";
import { File } from '../../File.mjs';

/**
 * 解析 Csv 數據轉換成 Json 輸出, data 需要傳遞 array
 */
async function csvToJson(data) {
    let readData = "";

    for (const filePath of data) { // 讀出來的是字串, 將所有字串合併
        readData += await File.Read(`${filePath}.csv`, false);
    };

    const parseBox = {};
    for (const row of readData.split("\r\n")) {
        for (const cell of row.replace(/"/g, "").split(",")) {
            if (/^\d+$/.test(cell)) continue;
            parseBox[cell.replace(/_/g, " ")] = "";
        }
    }

    File.Write(parseBox, "Csv.json");
}

/**
 * 用於快速獲取 Wiki 角色列表的範本
 */
function printWikiCharacterList() {
    const data = {};
    document.querySelectorAll("dl dt").forEach(item => {
        const match = item.textContent.match(/^(.+?)\s*（.*?，\s*([\w\s]+)）/);
        if (match) {
            data[match[2].toLowerCase()] = match[1];
        }
    });

    console.log(JSON.stringify(data, null, 2));
}


/**
 * 用於抓取: https://github.com/EhTagTranslation/Database
 */
const createCrawler = (() => {
    const cnToTw = OpenCC.Converter({ from: "cn", to: "tw" });

    // 抓取並解析單一類型
    async function fetchType(type, name) {
        const remote = await axios.get(`https://raw.githubusercontent.com/EhTagTranslation/Database/master/database/${type}.md`);
        const $ = cheerio.load(marked.marked(remote.data)); // 將 md 數據解析為 html 後載入

        const dict = {};
        $("tbody tr").slice(1).each((_, tr) => { // 跳過第一個查找 遍歷所有 tr
            const td = $(tr).find("td"); // 從 tr 中取出所有 td

            const key = $(td[0]).text().trim();
            const value = $(td[1]).text().trim();

            if (!(key && value)) return;
            if (/^\d+$/.test(key)) return; // 排除 key 都是數字
            if (key.length < 3) return; // 排除 key 長度小於 3
            if (key.toLowerCase() === value.toLowerCase()) return; // 排除 key 和 value 相同

            const noSpaceValue = value.replace(" | ", "|");
            dict[key] = name === "Group" ? noSpaceValue : cnToTw(noSpaceValue); // 轉換繁體 (Group 會有日文不轉換)
        });

        return dict;
    };

    // name 層非嚴格看 key, 嚴格加看 value
    function filterNew(entries, excludeData, nameJson, strict) {
        return Object.fromEntries(entries.filter(([key, value]) => {
            if (Object.hasOwn(excludeData, key)) return false; // Exclude 命中直接排除
            if (!Object.hasOwn(nameJson, key)) return true; // 本地沒有 → 放行

            // ! 嚴格模式的 value 比對, 目前的字典已繁中翻譯部份客製化, 使用了話需要人工比對
            return strict && nameJson[key] !== value;
        }));
    };

    // 創建時立即導入 Exclude.json 長期存儲
    const excludeStorage = File.Read("../Exclude.json");

    return {
        /**
         * @param {array} data - 需要是 [{ name, uri: ["type"...], strict? }, ...] 的格式
         * @param {boolean} [strict=false] - 嚴格模式全域開關, 傳遞 true 後整批啟動;
         */
        async run(data, strict = false) {
            const excludeData = await excludeStorage; // 引用長期存儲的排除字典

            // 所有 item × 所有 uri 併發爬取, 等待全部完成後才進入比對
            const crawledBox = {};
            await Promise.all(data.map(async ({ name, uri, strict: itemStrict }) => {
                const dicts = await Promise.all(uri.map(type =>
                    fetchType(type, name).catch(error => { // 單一類型失敗不中斷其餘
                        console.error(`${name} 的 ${type} 爬取失敗`);
                        console.error(error);
                        return {};
                    })
                ));

                crawledBox[name] = { merged: Object.assign({}, ...dicts), itemStrict };
            }));

            // 合併字典先跟 Exclude 比, 未排除才跟 ../{name}.json 比後輸出
            for (const [name, { merged, itemStrict }] of Object.entries(crawledBox)) {
                // 全域開關未啟動 (false) 時, 才檢查物件內的嚴格模式標籤
                const strictMode = strict || Boolean(itemStrict);

                const nameJson = await File.Read(`../${name}.json`);
                const newData = filterNew(Object.entries(merged), excludeData, nameJson, strictMode);

                Object.keys(newData).length > 0
                    ? File.Write(newData, `R:/New_${name}.json`) // 將新數據輸出到, 緩存硬碟
                    : console.log(`${name} 無新數據`);
            }

            return true;
        }
    };
})();

createCrawler.run([
    { name: "Character", uri: ["character"] },
    { name: "Cosplayer", uri: ["cosplayer"] },
    { name: "Parody", uri: ["parody"] },
    { name: "Group", uri: ["group"] },
    { name: "Tags", uri: ["other", "mixed", "male", "female"] },
]);