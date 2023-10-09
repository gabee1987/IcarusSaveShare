require("@electron/remote/main").initialize();
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const { enable } = require("@electron/remote/main");

ipcMain.handle("open-dialog", async () => {
  return await dialog.showOpenDialog(mainWindow, {
    /* ... some options ... */
  });
});

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      //   sandbox: false,
      nodeIntegration: true,
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

// app.on("ready", createWindow);
app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

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
