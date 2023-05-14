import { fileURLToPath } from "url";
import path from "path";
import open from "fs";
process.chdir(path.dirname(fileURLToPath(import.meta.url)));

// 輸出文件
function GenerateWords(Data, Save="All_Words.json") {
    open.writeFile(
        Save,
        JSON.stringify(Data, null, 4),
    err => {
        err ? console.log(`${Save}: 輸出失敗`) : console.log(`${Save}: 輸出成功`);
    });
};

// 讀取文件
function ReadWords(Path) {
    return new Promise((resolve, reject) => {
        open.readFile(Path, "utf-8", (err, data) => {
            const Read = err ? false : data ?? false;
            if (Read) resolve(JSON.parse(Read));
            else {
                console.log(err);
                resolve({});
            }
        });
    });
};

/**
 * @param {Array} Data - 數據需要是 ["json1", "json2"...] 的格式
 * @param {boolean} Sort - 是否進行排序
 * @param {boolean} Merge - 是否合併輸出 (合併輸出就會是 All_Words.json)
 * @param {boolean} LengthSort - 是否使用長度來排序, 否的話使用 字母
 * @param {boolean} SimilarExcl - 排除 key 和 value 類似的, 會另外輸出類似的
 */
async function DataCleaning({
    Data,
    Sort=true,
    Merge=false,
    LengthSort=true,
    SimilarExcl=false,
}={}) {
    const Read_Data = {}, Similar = {};

    for (const Path of Data) { // 讀取所有傳入的數據
        Read_Data[Path] = await ReadWords(`${Path}.json`);
    };

    if (Merge) {
        let Cache = Sort ? [] : {};
        const ProcessedData = Object.assign(...Object.values(Read_Data)); // 將全部物件合併
        for (const [Key, Value] of Object.entries(ProcessedData)) {

            const Cleaning = CleaningTreatment(Key, Value);
            if (!Cleaning) continue;
            const [Clean_key, Clean_value] = Cleaning;

            Sort
                ? Cache.push({
                    data: { [Clean_key]: Clean_value },
                    length: (Clean_key + Clean_value).length,
                })
                : Cache[Clean_key] = Clean_value;
        };

        if (Sort) Cache = SortBy(Cache);
        SimilarExcl && OutputSimilar();
        GenerateWords(Cache); // 輸出文件
    } else {
        const Split_Box = {};
        for (const [Key, Value] of Object.entries(Read_Data)) {
            let Cache = Sort ? [] : {};

            for (const [V_Key, V_Value] of Object.entries(Value)) {

                const Cleaning = CleaningTreatment(V_Key, V_Value);
                if (!Cleaning) continue;
                const [Clean_key, Clean_value] = Cleaning;

                Sort
                    ? Cache.push({
                        data: { [Clean_key]: Clean_value },
                        length: (Clean_key + Clean_value).length,
                    })
                    : Cache[Clean_key] = Clean_value;
            }

            if (Sort) Cache = SortBy(Cache);
            Split_Box[Key] = Cache;
        };

        // 無合併的數據, 會進行比對, 由後傳入的覆蓋先傳入的
        const All_key = Object.keys(Split_Box);
        let key_Index = All_key.length - 1;

        for (; key_Index >= 0; key_Index--) { // 後像依序像前面比較, 並刪除前面重複的值
            const compareKeys = Object.keys(Split_Box[All_key[key_Index]]);
            for (let Comp_Index = key_Index - 1; Comp_Index >= 0; Comp_Index--) {
                for (const key of compareKeys) {
                    delete Split_Box[All_key[Comp_Index]][key];
                }
            }
        };

        // 最後分別輸出
        SimilarExcl && OutputSimilar();
        for (const [key, value] of Object.entries(Split_Box)) {
            GenerateWords(value, `${key}.json`);
        }
    }

    // 輸出類似
    function OutputSimilar() {
        if (Object.keys(Similar).length > 0) GenerateWords(Similar, `Similar.json`);
    };

    // 清潔方式
    function CleaningTreatment(Key, Value) {
        if (/^\d+$/.test(Key)) return; // key 值都是數字的排除
        const [clean_key, clean_value] = [Key.trim().toLowerCase(), Value.trim()]; // 清潔數據格式
        if (SimilarExcl) {
            const [similar_key, similar_value] = [
                Key.replace(/[\W_]+/g, ""),
                Value.toLowerCase().replace(/[\W_]+/g, "")
            ];
            if (similar_key == similar_value) { // 對相似的進行排除
                Similar[clean_key] = clean_value;
                return;
            }
        }
        return [clean_key, clean_value];
    };

    // 排序方式
    function SortBy(Cache) {
        LengthSort
            ? Cache.sort((a, b) => a.length - b.length) // 長度排序
            : Cache.sort((a, b) => Object.keys(a.data)[0].localeCompare(Object.keys(b.data)[0])); // 單字排序

        const Result = {};
        Cache.forEach(item => {
            Object.assign(Result, item.data);
        })

        return Result;
    };
};


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
    document.querySelectorAll("article.markdown-body table:nth-child(2) tbody:nth-child(2) tr").forEach(tr=> {
        const td = tr.querySelectorAll("td");
        const [key, value] = [td[0].textContent, td[1].textContent];
        if (key && value) dict[key] = value;
    });
    OuputJson(JSON.stringify(dict, null, 2));
};

/* ======================================================= */

// 後傳入的優先級越高

DataCleaning({ // 個別清洗
    LengthSort: false,
    Data: ["Beautify", "Group", "Artist", "Parody", "Character", "Short", "Long", "Language", "Tags"]
});

setTimeout(() => {
    DataCleaning({ // 整合輸出
        Merge: true,
        Data: ["Beautify", "Group", "Artist", "Parody", "Character", "Short", "Long", "Language", "Tags"]
    });
}, 1000);