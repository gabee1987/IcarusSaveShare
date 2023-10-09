const { contextBridge, ipcRenderer } = require("electron");
const fs = require("fs");
const path = require("path");
const dropboxV2Api = require("dropbox-v2-api");
const config = JSON.parse(
  fs.readFileSync(path.join(__dirname, "config.json"), "utf8")
);
const zlib = require("zlib");

contextBridge.exposeInMainWorld("electron", {
  fs: {
    readFile: fs.readFile,
    statSync: fs.statSync,
    copyFileSync: fs.copyFileSync,
    writeFileSync: fs.writeFileSync,
    createReadStream: fs.createReadStream,
    writeFile: fs.writeFile,
    readdirSync: fs.readdirSync,
    existsSync: fs.existsSync,
  },
  path: {
    join: path.join,
  },
  dialog: ipcRenderer.invoke.bind(null, "open-dialog"),
  config: config,
  dropboxV2Api: {
    authenticate: dropboxV2Api.authenticate,
  },
  env: {
    // Expose the required environment variable
    LOCALAPPDATA: process.env.LOCALAPPDATA,
  },
  gzip: (data, callback) => {
    zlib.gzip(data, (err, compressedData) => {
      callback(err, compressedData);
    });
  },
  ungzip: (data, callback) => {
    zlib.ungzip(data, (err, decompressedData) => {
      callback(err, decompressedData);
    });
  },
  directories: (dirPath) => {
    return fs.readdirSync(dirPath).filter((name) => {
      return fs.statSync(path.join(dirPath, name)).isDirectory();
    });
  },
});
