import open from "fs";

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
            resolve(JSON.parse(err ? {} : data ?? {}));
        });
    });
};

/**
 * @param {Array} Data - 數據需要是 ["json1", "json2"...] 的格式
 * @param {boolean} Sort - 是否進行排序
 * @param {boolean} Merge - 是否合併輸出 (合併輸出就會是 All_Words.json)
 * @param {boolean} LengthSort - 是否使用長度來排序, 否的話使用 字母
 */
async function DataCleaning({
    Data,
    Sort=true,
    Merge=false,
    LengthSort=true,
}={}) {
    const Read_Data = {};
    const Cleaning = (Key, Value) => [Key.trim().toLowerCase(), Value.trim()];

    for (const Path of Data) { // 讀取所有傳入的數據
        Read_Data[Path] = await ReadWords(`${Path}.json`);
    };

    if (Merge) {
        let Cache = Sort ? [] : {};
        const ProcessedData = Object.assign(...Object.values(Read_Data)); // 將全部物件合併
        for (const [Key, Value] of Object.entries(ProcessedData)) {
            const [Clean_key, Clean_value] = Cleaning(Key, Value); // 載入物件值進行清洗
            Sort
                ? Cache.push({
                    data: { [Clean_key]: Clean_value },
                    length: (Clean_key + Clean_value).length,
                })
                : Cache[Clean_key] = Clean_value;
        };

        if (Sort) Cache = SortBy(Cache);
        GenerateWords(Cache); // 輸出文件
    } else {
        const Split_Box = {};
        for (const [Key, Value] of Object.entries(Read_Data)) {
            let Cache = Sort ? [] : {};

            for (const [V_Key, V_Value] of Object.entries(Value)) {
                const [Clean_key, Clean_value] = Cleaning(V_Key, V_Value);

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
        for (const [key, value] of Object.entries(Split_Box)) {
            GenerateWords(value, `${key}.json`);
        }
    }

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
    }
};

/* ======================================================= */

// 後傳入的優先級越高

DataCleaning({
    LengthSort: false,
    Data: ["Short", "Long", "Language", "Artist", "Character", "Title", "Beautify", "Tags"]
});