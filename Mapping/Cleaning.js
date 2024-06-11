import path from "path";
import { fileURLToPath } from "url";
process.chdir(path.dirname(fileURLToPath(import.meta.url)));

import { File } from "../File.mjs";

File.Read("./List.json", true).then(List => {
    File.Write(List, "./List.json");
})