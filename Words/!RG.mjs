import open from "fs";

// 讀取文件
export function ReadWords(Path, Parse=true) {
    return new Promise((resolve, reject) => {
        open.readFile(Path, "utf-8", (err, data) => {
            const Read = err ? false : data ?? false;
            if (Read) resolve(Parse ? JSON.parse(Read) : data);
            else {
                console.log(err);
                resolve({});
            }
        });
    });
};

// 輸出文件
export function GenerateWords(Data, Save="All_Words.json") {
    open.writeFile(
        Save,
        JSON.stringify(Data, null, 4),
    err => {
        err ? console.log(`${Save}: 輸出失敗`) : console.log(`${Save}: 輸出成功`);
    });
};