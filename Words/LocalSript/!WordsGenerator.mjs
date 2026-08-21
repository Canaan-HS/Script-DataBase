import path from "path";
import { fileURLToPath } from "url";
process.chdir(path.dirname(fileURLToPath(import.meta.url)));

import { File } from "../../File.mjs";
import { log } from "console";

/**
 * @param {Array} jsonName - 數據需要是 ["json1", "json2"...] 的格式
 * @param {boolean} sort - 是否進行排序
 * @param {boolean} merge - 合併模式 (將所有數據合併為一個檔案)
 * @param {string} mergeName - 合併模式的檔名
 * @param {boolean} lengthSort - 是否使用長度來排序, 否的話使用 字母
 * @param {boolean} similarExcl - 排除 key 和 value 相似的, 另外輸出結果
 */
async function dataCleaning({
    jsonName,
    sort = true,
    merge = false,
    mergeName = "All_Words",
    lengthSort = true,
    similarExcl = false
} = {}) {
    const readData = {}, similarData = {};

    for (const name of jsonName) { // 讀取所有傳入的數據
        readData[name] = await File.Read(`../${name}.json`);
    };

    if (merge) {
        let cache = sort ? [] : {};
        const processedData = Object.assign(...Object.values(readData)); // 將全部物件合併
        for (const [key, value] of Object.entries(processedData)) {

            const cleaning = cleaningTreatment(key, value);
            if (!cleaning) continue;
            const [cleankey, cleanvalue] = cleaning;

            sort
                ? cache.push({
                    data: { [cleankey]: cleanvalue },
                    length: (cleankey + cleanvalue).length,
                })
                : cache[cleankey] = cleanvalue;
        };

        if (sort) cache = sortBy(cache);
        similarExcl && outputSimilar();
        File.Write(cache, `../${mergeName}.json`); // 輸出文件

        return true; // 完成回傳
    } else {
        const splitBox = {};
        for (const [key, value] of Object.entries(readData)) {
            let cache = sort ? [] : {};

            for (const [vKey, vValue] of Object.entries(value)) {

                const cleaning = cleaningTreatment(vKey, vValue);
                if (!cleaning) continue;
                const [cleankey, cleanvalue] = cleaning;

                sort
                    ? cache.push({
                        data: { [cleankey]: cleanvalue },
                        length: (cleankey + cleanvalue).length,
                    })
                    : cache[cleankey] = cleanvalue;
            }

            if (sort) cache = sortBy(cache);
            splitBox[key] = cache;
        };

        // 無合併的數據, 會進行比對, 由後傳入的覆蓋先傳入的
        const allkeys = Object.keys(splitBox);
        let keyIndex = allkeys.length - 1;

        for (; keyIndex >= 0; keyIndex--) { // 後像依序像前面比較, 並刪除前面重複的值
            const compareKeys = Object.keys(splitBox[allkeys[keyIndex]]);
            for (let compIndex = keyIndex - 1; compIndex >= 0; compIndex--) {
                for (const key of compareKeys) {
                    delete splitBox[allkeys[compIndex]][key];
                }
            }
        };

        // 最後分別輸出
        similarExcl && outputSimilar();
        for (const [key, value] of Object.entries(splitBox)) {
            File.Write(value, `../${key}.json`);
        }

        return true; // 完成回傳
    }

    // 輸出類似
    function outputSimilar() {
        if (Object.keys(similarData).length > 0) File.Write(similarData, `Similar.json`);
    };

    // 清潔方式
    function cleaningTreatment(key, value) {
        const [cleanKey, cleanValue] = [key.trim().toLowerCase(), value.trim()]; // 清潔數據格式

        // ? 針對特殊檔案進行跳過
        if (jsonName === "Exclude") return [cleanKey, cleanValue];

        if (/^\d+$/.test(cleanKey)) return; // 排除 key 都是數字
        if (cleanKey.length < 3) return; // 排除 key 長度小於 3
        if (cleanKey === cleanValue) return; // 排除 key 和 value 相同

        if (similarExcl) { // 對相似的進行排除
            const [similar_key, similar_value] = [
                key.replace(/[\W_]+/g, ""),
                value.toLowerCase().replace(/[\W_]+/g, "")
            ];

            if (similar_key === similar_value) {
                similarData[cleanKey] = cleanValue;
                return;
            }
        }

        return [cleanKey, cleanValue];
    };

    // 排序方式
    function sortBy(cache) {
        lengthSort
            ? cache.sort((a, b) => a.length - b.length) // 長度排序
            : cache.sort((a, b) => Object.keys(a.data)[0].localeCompare(Object.keys(b.data)[0])); // 單字排序

        const Result = {};
        cache.forEach(item => {
            Object.assign(Result, item.data);
        })

        return Result;
    };
};

/* ======================================================= */

async function generatorWord() {
    const jsonName = ["Beautify", "Cosplayer", "Short", "Long", "Language", "Group", "Artist", "Character", "Parody", "Tags"];

    // 個別處理
    await dataCleaning({ lengthSort: false, jsonName });

    // 完整 合併處理 (合併模式, 列表越後面的數據會覆蓋前面的數據)
    await dataCleaning({ merge: true, jsonName });

    dataCleaning({ // 精選 合併處理
        merge: true,
        mergeName: "Curated_Words",
        jsonName: ["Beautify", "Cosplayer", "Long", "Language", "Character", "Parody", "Tags"]
    });
}

// Exclude 處理
dataCleaning({ jsonName: ["Exclude"] });

generatorWord();