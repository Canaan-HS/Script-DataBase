import fs from "fs";

export const File = (()=> {

    function Read(Path, Parse=true) {
        return new Promise((resolve, reject) => {
            fs.readFile(Path, "utf-8", (err, data) => {
                const Read = err ? false : data ?? false;
                if (Read) resolve(Parse ? JSON.parse(Read) : data);
                else {
                    console.log(err);
                    resolve({});
                }
            })
        })
    };

    function Write(OutPutData, SaveName="All_Words.json") {
        const Content = SaveName.endsWith("json")
            ? JSON.stringify(OutPutData, null, 4)
            : OutPutData;

        fs.writeFile(
            SaveName, Content,
        err => {
            err ? console.log(`${SaveName}: 輸出失敗`) : console.log(`${SaveName}: 輸出成功`);
        });
    };

    return {Read, Write};
})();