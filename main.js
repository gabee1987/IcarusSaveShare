require("@electron/remote/main").initialize();
const path = require("path");
const { app, BrowserWindow } = require("electron");
const { enable } = require("@electron/remote/main");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      //   sandbox: false,
      nodeIntegration: false, // Turn off node integration
      contextIsolation: true, // Isolate context
      nodeIntegrationInWorker: true,
      enableRemoteModule: true,
      preload: path.join(__dirname, "preload.js"), // Specify the preload script
    },
  });

  enable(mainWindow.webContents);
  mainWindow.loadFile("index.html");

  mainWindow.on("closed", function () {
    mainWindow = null;
  });
}

app.on("ready", createWindow);

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", function () {
  if (mainWindow === null) {
    createWindow();
  }
});
