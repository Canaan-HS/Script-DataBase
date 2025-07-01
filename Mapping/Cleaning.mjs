import path from "path";
import { fileURLToPath } from "url";
process.chdir(path.dirname(fileURLToPath(import.meta.url)));

import * as OpenCC from "opencc-js";
import clipboardy from "clipboardy";
import { File } from "../File.mjs";

/* 列表清洗 key = 繁體, value = 簡體 */
function Clear(Source = "./List.json") {
    const CNtoTW = OpenCC.Converter({ from: "cn", to: "tw" });
    const TWtoCN = OpenCC.Converter({ from: "tw", to: "cn" });

    File.Read(Source, true).then(List => {
        const New = {};

        for (const [Key, Value] of Object.entries(List)) {
            if (Key === Value) continue; // 繁簡相同跳過

            const KeyToTW = CNtoTW(Key);
            const ValueToTW = CNtoTW(Value);
            const ValueToCN = TWtoCN(Value);

            // Key 不是繁體 跳過
            if (KeyToTW !== Key) continue;

            // 判斷 Value：
            // 如果 Value 是繁體（ValueToTW === Value），且 Value 是繁體（ValueToCN === Value），跳過
            // 如果 Value 是簡體（ValueToCN !== Value），則保留，即使 ValueToTW === Value（OpenCC 不認識）

            const ValueIsSimplified = ValueToCN !== Value;
            const ValueIsTraditional = ValueToTW === Value;

            if (ValueIsTraditional && !ValueIsSimplified) {
                // Value 是繁體且不是簡體 → 跳過
                continue;
            }

            const FinalKey = (ValueToTW !== Key) ? ValueToTW : Key;
            New[FinalKey.trim()] = Value.trim();
        }

        File.Write(New, Source);
    })
};

function Compare(Words) {
    File.Read("./List.json", true).then(List => {
        const New = {};

        for (const [Key, Value] of Object.entries(Words)) {
            if (!List[Key]) New[Key] = Value;
        }

        File.Write(New, "./Differ.json");
    });
};

function Generate() {
    let tcStr = "";
    let scStr = "";

    File.Read("./List.json", true).then(List => {
        for (const [Key, Value] of Object.entries(List)) {
            tcStr += Key.replace(/\r?\n/g, "");
            scStr += Value.replace(/\r?\n/g, "");
        }

        clipboardy.writeSync(`    const tcStr = '${tcStr}';\n    const scStr = '${scStr}';`);
        console.log("已複製到剪貼簿");
    })
};


Clear();
// Generate();

// Compare()