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
export function GenerateWords(OutPutData, SaveName="All_Words.json") {
    const Content = SaveName.endsWith("json")
        ? JSON.stringify(OutPutData, null, 4)
        : OutPutData;

    open.writeFile(
        SaveName, Content,
    err => {
        err ? console.log(`${SaveName}: 輸出失敗`) : console.log(`${SaveName}: 輸出成功`);
    });
};