import path from "path";
import { fileURLToPath } from "url";
process.chdir(path.dirname(fileURLToPath(import.meta.url)));

import * as OpenCC from "opencc-js";
import clipboardy from "clipboardy";
import { File } from "../File.mjs";

// 該表紀錄的數據 key 是繁體 value 是簡體
const mainJson = "./tc2scStr.json";

/* 列表清洗 key = 繁體, value = 簡體 */
function clear(source = mainJson) {
    const cn2tw = OpenCC.Converter({ from: "cn", to: "tw" });
    const tw2cn = OpenCC.Converter({ from: "tw", to: "cn" });

    File.Read(source, true).then(list => {
        const newData = {};

        for (const [key, value] of Object.entries(list)) {
            if (key === value) continue; // 繁簡相同跳過

            const twKey = cn2tw(key);
            const twValue = cn2tw(value);
            const cnValue = tw2cn(value);

            // key 不是繁體 跳過
            if (twKey !== key) continue;

            // 判斷 Value：
            // 如果 value 是繁體（ValueToTW === Value），且 value 是繁體（ValueToCN === Value），跳過
            // 如果 value 是簡體（ValueToCN !== Value），則保留，即使 twValue === Value（OpenCC 不認識）

            const valueIsSimplified = cnValue !== value;
            const valueIsTraditional = twValue === value;

            if (valueIsTraditional && !valueIsSimplified) {
                // value 是繁體且不是簡體 → 跳過
                continue;
            }

            const FinalKey = (twValue !== key) ? twValue : key;
            newData[FinalKey.trim()] = value.trim();
        }

        File.Write(newData, source);
    })
};

function compare(words) {
    File.Read(mainJson, true).then(list => {
        const newData = {};

        for (const [key, value] of Object.entries(words)) {
            if (!list[key]) newData[key] = value;
        }

        File.Write(newData, "./differ.json");
    });
};

function generate() {
    let tcStr = "";
    let scStr = "";

    File.Read(mainJson, true).then(list => {
        for (const [key, value] of Object.entries(list)) {
            tcStr += key.replace(/\r?\n/g, "");
            scStr += value.replace(/\r?\n/g, "");
        }

        clipboardy.writeSync(`    const tcStr = '${tcStr}';\n    const scStr = '${scStr}';`);
        console.log("已複製到剪貼簿");
    })
};


clear();
// generate();

// compare()