import * as fs from "fs";
const root = __dirname + "/rules";
for (const fileName of fs.readdirSync(root)) {
    if (fileName.endsWith(".ts")) {
        const path = root + "/" + fileName;
        console.log(`Running ${fileName}`);
        require(path);
    }
}
