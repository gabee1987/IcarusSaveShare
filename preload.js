const { contextBridge, ipcRenderer } = require("electron");
const fs = require("fs");
const path = require("path");
const dropboxV2Api = require("dropbox-v2-api");
const config = JSON.parse(
  fs.readFileSync(path.join(__dirname, "config.json"), "utf8")
);

contextBridge.exposeInMainWorld("electron", {
  fs: {
    readFile: fs.readFile,
    statSync: fs.statSync,
    copyFileSync: fs.copyFileSync,
    writeFileSync: fs.writeFileSync,
    createReadStream: fs.createReadStream,
  },
  path: {
    join: path.join,
  },
  dialog: ipcRenderer.invoke.bind(null, "open-dialog"),
  config: config,
  dropboxV2Api: {
    authenticate: dropboxV2Api.authenticate,
  },
});
