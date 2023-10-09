const fs = require("fs");
const path = require("path");
const { dialog } = require("electron").remote;
const dropboxV2Api = require("dropbox-v2-api");

const config = require("./config.json");
const DROPBOX_TOKEN = config.DROPBOX_TOKEN;

const dropbox = dropboxV2Api.authenticate({
  token: "YOUR_DROPBOX_TOKEN",
});

function checkForNewerVersion() {
  // This will get metadata for the file from Dropbox.
  dropbox(
    {
      resource: "files/get_metadata",
      parameters: {
        path: "/Prospect.zip",
      },
    },
    (err, result) => {
      if (err) {
        document.getElementById("messages").innerText =
          "Error checking for newer version.";
        return;
      }

      const localFilePath = path.join(
        process.env.LOCALAPPDATA,
        "Icarus/Saved/PlayerData/[SteamId]/Prospect"
      );
      const localFileModifiedTime = fs.statSync(localFilePath).mtime;
      const dropboxFileModifiedTime = new Date(result.client_modified);

      if (dropboxFileModifiedTime > localFileModifiedTime) {
        document.getElementById("messages").innerText =
          "A newer version is available!";
      } else {
        document.getElementById("messages").innerText =
          "You have the latest version.";
      }
    }
  );
}

function downloadProspect() {
  dropbox(
    {
      resource: "files/download",
      parameters: {
        path: "/Prospect.zip",
      },
    },
    (err, result, response) => {
      if (err) {
        document.getElementById("messages").innerText = "Error downloading.";
        return;
      }

      const localFilePath = path.join(
        process.env.LOCALAPPDATA,
        "Icarus/Saved/PlayerData/[SteamId]/Prospect"
      );

      // Before overwriting, backup the existing file.
      fs.copyFileSync(localFilePath, localFilePath + ".backup");

      // Write the new downloaded content.
      fs.writeFileSync(localFilePath, response);

      document.getElementById("messages").innerText = "Download successful!";
    }
  );
}

function uploadProspect() {
  const localFilePath = path.join(
    process.env.LOCALAPPDATA,
    "Icarus/Saved/PlayerData/[SteamId]/Prospect"
  );

  dropbox(
    {
      resource: "files/upload",
      parameters: {
        path: "/Prospect.zip",
        mode: "overwrite",
      },
      readStream: fs.createReadStream(localFilePath),
    },
    (err, result) => {
      if (err) {
        document.getElementById("messages").innerText = "Error uploading.";
        return;
      }

      document.getElementById("messages").innerText = "Upload successful!";
    }
  );
}

document
  .getElementById("checkBtn")
  .addEventListener("click", checkForNewerVersion);
document
  .getElementById("downloadBtn")
  .addEventListener("click", downloadProspect);
document.getElementById("uploadBtn").addEventListener("click", uploadProspect);
