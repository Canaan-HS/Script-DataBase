import path from "path";
import { fileURLToPath } from "url";
process.chdir(path.dirname(fileURLToPath(import.meta.url)));

import { File } from "../../File.mjs";
import { log } from "console";

const createCleaner = (() => {

    // 排序
    function sortBy(cache, lengthSort) {
        lengthSort
            ? cache.sort((a, b) => a.length - b.length) // 長度排序
            : cache.sort((a, b) => Object.keys(a.data)[0].localeCompare(Object.keys(b.data)[0])); // 單字排序

        const result = {};
        cache.forEach(item => Object.assign(result, item.data));

        return result;
    };

    // 清洗
    function cleaningTreatment(key, value, { skipClean = false, similarExcl = false, similarData }) {
        const [cleanKey, cleanValue] = [key.trim().toLowerCase(), value.trim()]; // 正規化數據格式
        if (skipClean) return [cleanKey, cleanValue];

        if (/^\d+$/.test(cleanKey)) return; // 排除 key 都是數字
        if (cleanKey.length < 3) return; // 排除 key 長度小於 3
        if (cleanKey === cleanValue) return; // 排除 key 和 value 相同

        if (similarExcl) { // 對相似的進行排除
            const [similarKey, similarValue] = [
                key.replace(/[\W_]+/g, ""),
                value.toLowerCase().replace(/[\W_]+/g, "")
            ];

            if (similarKey === similarValue) {
                similarData[cleanKey] = cleanValue;
                return;
            }
        }

        return [cleanKey, cleanValue];
    };

    // 字典 調用 清洗 + 排序
    function buildCache(entries, { sort, lengthSort, ...treatOptions }) {
        const cache = sort ? [] : {};

        for (const [key, value] of entries) {
            const cleaning = cleaningTreatment(key, value, treatOptions);
            if (!cleaning) continue;
            const [cleanKey, cleanValue] = cleaning;

            sort
                ? cache.push({
                    data: { [cleanKey]: cleanValue },
                    length: (cleanKey + cleanValue).length,
                })
                : cache[cleanKey] = cleanValue;
        };

        return sort ? sortBy(cache, lengthSort) : cache;
    };

    // 輸出類似
    function outputSimilar(similarData) {
        if (Object.keys(similarData).length > 0) File.Write(similarData, `Similar.json`);
    };

    // 唯一對外接口
    return {
        /**
         * @param {array} wordList - 數據需要是 ["json1", "json2"...] 的格式
         * @param {boolean} sort - 是否進行排序
         * @param {boolean} merge - 合併模式 (將所有數據合併為一個檔案)
         * @param {string} mergeName - 合併模式的檔名
         * @param {boolean} lengthSort - 是否使用長度來排序, 否的話使用 字母
         * @param {boolean} similarExcl - 排除 key 和 value 相似的, 另外輸出結果
         */
        async run({
            wordList,
            sort = true,
            merge = false,
            mergeName = "All_Words",
            lengthSort = true,
            similarExcl = false
        } = {}) {
            const readData = {};
            for (const name of wordList) { // 讀取所有傳入的數據
                readData[name] = await File.Read(`../${name}.json`);
            };

            const similarData = {}; // 每次調用初始化, 引用傳給工具累加

            if (merge) {
                // 合併模式: 依照 wordList 順序, 後項覆蓋前項, 最後完整輸出至 mergeName
                const mergedData = Object.assign({}, ...Object.values(readData));
                File.Write(buildCache(Object.entries(mergedData), { sort, lengthSort, similarExcl, similarData }), `../${mergeName}.json`);
            } else {
                // 個別模式: 每個字典只做自己的清理與排序, 保留各自內容
                for (const [name, data] of Object.entries(readData)) {
                    File.Write(buildCache(Object.entries(data), { sort, lengthSort, similarExcl, similarData, skipClean: name === "Exclude" }), `../${name}.json`);
                }
            }

            similarExcl && outputSimilar(similarData);
            return true;
        }
    };
})();

/* ======================================================= */

async function generatorWord() {
    const wordList = ["Cosplayer", "Short", "Long", "Language", "Group", "Artist", "Character", "Parody", "Beautify", "Tags"];

    // 個別處理
    await createCleaner.run({ lengthSort: false, wordList });

    // 完整 合併處理 (合併模式, 列表越後面的數據會覆蓋前面的數據)
    await createCleaner.run({ merge: true, wordList });

    createCleaner.run({ // 精選 合併處理
        merge: true,
        mergeName: "Curated_Words",
        wordList: ["Cosplayer", "Long", "Language", "Character", "Parody", "Beautify", "Tags"]
    });
}

// Exclude 處理
// createCleaner.run({ wordList: ["Exclude"] });

generatorWord();