import path from 'path';
import { fileURLToPath } from 'url';
process.chdir(path.dirname(fileURLToPath(import.meta.url)));

import axios from 'axios';
import * as marked from 'marked';
import * as cheerio from 'cheerio';
import { ReadWords, GenerateWords } from './!RG.mjs';

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
 * 該函數用於抓取: https://github.com/EhTagTranslation/Database
 * 
 * 讀取本地字典, 獲取更新的部份
 */
async function DataCrawl(Data) {
    const localKeys = new Set( // 獲取本地所有已存在 字典 key
        Object.keys(await ReadWords("All_Words.json"))
    );

    for (const data of Data) {
        const NewData = {}; // 本存遠端新字典
        const {Name, Uri} = data; // 解構傳遞的數據

        for (const type of Uri) { // 取得數據類型
            try {
                const remote = await axios.get(`https://raw.githubusercontent.com/EhTagTranslation/Database/master/database/${type}.md`);
                const html = marked.marked(remote.data); // 將 md 數據解析為 html
                const $ = cheerio.load(html); // 使用 cheerio 解析 HTML 內容

                // 跳過第一個查找 遍歷所有 tr
                const dict = {};
                $("tbody tr").slice(1).each((_, tr) => {
                    const td = $(tr).find("td"); // 從 tr 中取出所有 td

                    const key = $(td[0]).text();
                    const value = $(td[1]).text();

                    if (key && value) {
                        const t_key = key.trim();
                        const t_value = value.trim();

                        if (
                            !/^\d+$/.test(t_key) // 排除 key 都是數字
                            && t_key.length > 2 // 排除 key 長度小於 2
                            && t_key.toLowerCase() != t_value.toLowerCase() // 排除 key 和 value 相同
                        ) dict[t_key] = t_value;
                    }
                });

                // 過濾已經擁有的 localKeys
                const filtered = Object.fromEntries(
                    Object.entries(dict).filter(([key]) => !localKeys.has(key))
                );

                // 最後合併到新字典
                Object.assign(NewData, filtered);
            } catch (error) {
                console.error(error);
            }
        };

        // 將新數據輸出到, 處理緩存硬碟
        GenerateWords(NewData, `R:/New_${Name}.json`);
    }
}

DataCrawl([
    {Name: "Character", Uri: ["character"]},
    {Name: "Parody", Uri: ["parody"]},
    {Name: "Group", Uri: ["group"]},
    {Name: "Tags", Uri: ["other", "mixed", "male", "female"]},
]);