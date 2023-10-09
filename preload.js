// window.electron = {
//   fs: require("fs"),
//   path: require("path"),
//   dialog: require("@electron/remote").dialog,
//   dropboxV2Api: require("dropbox-v2-api"),
// };
window.electron = {};
window.electron.fs = require("fs");
window.electron.path = require("path");
window.electron.dialog = require("@electron/remote").dialog;
window.electron.dropboxV2Api = require("dropbox-v2-api");
