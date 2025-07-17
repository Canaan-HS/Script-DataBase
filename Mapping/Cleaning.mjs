import path from "path";
import { fileURLToPath } from "url";
process.chdir(path.dirname(fileURLToPath(import.meta.url)));

import * as OpenCC from "opencc-js";
import clipboardy from "clipboardy";
import { File } from "../File.mjs";

/* 列表清洗 key = 繁體, value = 簡體 */
function Clear(Source = "./List.json") {
    const CNtoTW = OpenCC.Converter({ from: "cn", to: "tw" });

    File.Read(Source, true).then(List => {
        const New = {};

        for (const [Key, Value] of Object.entries(List)) {
            if (Key === Value) continue; // 繁體跟簡體一樣

            const KeyToTW = CNtoTW(Key);
            const ValueToTW = CNtoTW(Value);

            // 如果 Key 不是繁體，或 Value 是繁體，就跳過
            if (KeyToTW !== Key || ValueToTW === Value) continue;

            // Value 是簡體，但轉回繁體 ≠ Key → 修正 Key 為正確的繁體
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