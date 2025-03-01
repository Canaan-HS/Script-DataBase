import path from "path";
import { fileURLToPath } from "url";
process.chdir(path.dirname(fileURLToPath(import.meta.url)));

// import * as OpenCC from "opencc-js";
import clipboardy from "clipboardy";
import { File } from "../File.mjs";

function Clear() {
    // const converter = OpenCC.Converter({ from: 'tw', to: 'cn' });
    File.Read("./List.json", true).then(List => {
        const New = {};

        for (const [Key, Value] of Object.entries(List)) {
            if (Key == Value) continue;
            New[Key.trim()] = Value.trim();
        }

        File.Write(New, "./List.json");
    })
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


// Clear();
// Generate();