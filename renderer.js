console.log(window.electron);
const fs = window.electron.fs;
const path = window.electron.path;
const dialog = window.electron.dialog;
const dropboxV2Api = window.electron.dropboxV2Api;

const config = window.electron.config;
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

function getLocalSaveInfo() {
  const filePath = path.join(
    process.env.LOCALAPPDATA,
    `Icarus/Saved/PlayerData/${config.STEAM_ID}/Prospects/Nebula Nokedli.json`
  );

  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      document.getElementById("messages").innerText =
        "Error reading save file.";
      return;
    }

    const saveInfo = JSON.parse(data);
    const prospectInfo = saveInfo.ProspectInfo;

    let displayMessage = `Prospect Name: ${prospectInfo.ProspectID}\n`;
    displayMessage += `Difficulty: ${prospectInfo.Difficulty}\n`;
    displayMessage += `Time Spent: ${prospectInfo.ElapsedTime} seconds\n`;
    displayMessage += "Members:\n";

    prospectInfo.AssociatedMembers.forEach((member) => {
      displayMessage += `- ${member.AccountName} (${member.CharacterName}): ${
        member.IsCurrentlyPlaying ? "Currently Playing" : "Offline"
      }\n`;
    });

    document.getElementById("messages").innerText = displayMessage;
  });
}

// Check if the uploaded version is the most recent save
document
  .getElementById("checkBtn")
  .addEventListener("click", checkForNewerVersion);

// Download the world save file to the game's appData folder
document
  .getElementById("downloadBtn")
  .addEventListener("click", downloadProspect);

// Upload the world save file from the game's appData folder to DropBox
document.getElementById("uploadBtn").addEventListener("click", uploadProspect);

// Display the local world save informations
document
  .getElementById("getSaveInfoBtn")
  .addEventListener("click", getLocalSaveInfo);
