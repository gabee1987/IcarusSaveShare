console.log(window.electron);
const fs = window.electron.fs;
const path = window.electron.path;
const dialog = window.electron.dialog;
const dropboxV2Api = window.electron.dropboxV2Api;

const config = window.electron.config;
const DROPBOX_TOKEN = config.DROPBOX_TOKEN;

const LOCALAPPDATA = window.electron.env.LOCALAPPDATA;
const zlib = window.electron.zlib;

const dropbox = dropboxV2Api.authenticate({
  token: "YOUR_DROPBOX_TOKEN",
});

let detectedSteamID = null;

function detectCurrentUser() {
  const gameDataPath = path.join(LOCALAPPDATA, "Icarus", "Saved", "PlayerData");
  const steamIdDirectories = window.electron.directories(gameDataPath);

  // Assuming there's only one directory with the steam ID
  if (steamIdDirectories.length === 1) {
    const steamId = steamIdDirectories[0];

    // Store this steamId for global use
    detectedSteamID = steamId;

    // Find the user's name from the save file (if it exists)
    const saveFilePath = path.join(
      gameDataPath,
      steamId,
      "Prospects",
      "Nebula Nokedli.json"
    );

    if (fs.existsSync(saveFilePath)) {
      fs.readFile(saveFilePath, "utf8", (err, data) => {
        if (err) {
          document.querySelector(
            ".userInfo"
          ).innerHTML = `<span class="label">Error:</span> <span class="value">Reading save file for Steam ID: ${steamId}</span>`;
          return;
        }

        const saveInfo = JSON.parse(data);
        const user = saveInfo.ProspectInfo.AssociatedMembers.find(
          (member) => member.UserID === steamId
        );

        if (user) {
          document.querySelector(".userInfo").innerHTML = `
            <span class="label">User:</span> <span class="value">${user.AccountName}</span><br>
            <span class="label">Steam ID:</span> <span class="value">${steamId}</span>`;
        } else {
          document.querySelector(".userInfo").innerHTML = `
            <span class="label">Steam ID Detected:</span> <span class="value">${steamId}</span><br>
            <span class="label">Note:</span> <span class="value">User not found in save file.</span>`;
        }
      });
    } else {
      document.querySelector(
        ".userInfo"
      ).innerText = `Steam ID detected: ${steamId}, but save file not found.`;
    }
  } else {
    document.querySelector(".userInfo").innerText = "No Steam ID detected.";
  }
}

function checkForNewerVersion() {
  // Ensure we have detectedSteamID before proceeding
  if (!detectedSteamID) {
    document.getElementById("messages").innerText =
      "Steam ID not detected yet.";
    return;
  }

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
        LOCALAPPDATA,
        "Icarus/Saved/PlayerData",
        detectedSteamID,
        "Prospects"
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
  // Ensure we have detectedSteamID before proceeding
  if (!detectedSteamID) {
    document.getElementById("messages").innerText =
      "Steam ID not detected yet.";
    return;
  }

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
        LOCALAPPDATA,
        "Icarus/Saved/PlayerData",
        detectedSteamID,
        "Prospects"
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
  // Ensure we have detectedSteamID before proceeding
  if (!detectedSteamID) {
    document.getElementById("messages").innerText =
      "Steam ID not detected yet.";
    return;
  }

  const localFilePath = path.join(
    LOCALAPPDATA,
    "Icarus/Saved/PlayerData",
    detectedSteamID,
    "Prospects"
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
  // Ensure we have detectedSteamID before proceeding
  if (!detectedSteamID) {
    document.getElementById("messages").innerText =
      "Steam ID not detected yet.";
    return;
  }

  const filePath = path.join(
    LOCALAPPDATA,
    "Icarus/Saved/PlayerData",
    detectedSteamID,
    "Prospects",
    "Nebula Nokedli.json"
  );

  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      document.getElementById("messages").innerText =
        "Error reading save file.";
      return;
    }

    const saveInfo = JSON.parse(data);
    const prospectInfo = saveInfo.ProspectInfo;

    // Convert elapsed time
    let hours = Math.floor(prospectInfo.ElapsedTime / 3600);
    let minutes = Math.floor((prospectInfo.ElapsedTime % 3600) / 60);
    let seconds = prospectInfo.ElapsedTime % 60;

    let displayMessage = `
<span class="label">Prospect Name:</span> <span class="value">${prospectInfo.ProspectID}</span><br>
<span class="label">Difficulty:</span> <span class="value">${prospectInfo.Difficulty}</span><br>
<span class="label">Elapsed Time:</span> <span class="value">${hours}h ${minutes}m ${seconds}s</span><br>
<span class="label">Members:</span><br>`;

    prospectInfo.AssociatedMembers.forEach((member) => {
      displayMessage += `
<span class="value">- ${member.AccountName} (${member.CharacterName}): ${
        member.IsCurrentlyPlaying ? "Currently Playing" : "Offline"
      }</span><br>`;
    });

    document.getElementById("messages").innerHTML = displayMessage;
  });
}

function createBackup() {
  const prospectName = "Nebula Nokedli";
  const today = new Date();
  const dateStr = `${today.getFullYear()}_${
    today.getMonth() + 1
  }_${today.getDate()}_${today.getHours()}h${today.getMinutes()}m${today.getSeconds()}s`;
  const backupFileName = `${prospectName}_${dateStr}_backUp.gz`;

  // Path for the original prospect file
  const filePath = path.join(
    LOCALAPPDATA,
    "Icarus/Saved/PlayerData",
    detectedSteamID,
    "Prospects",
    "Nebula Nokedli.json"
  );

  // Path for the backup file
  const backupFilePath = path.join(
    LOCALAPPDATA,
    "Icarus/Saved/PlayerData",
    detectedSteamID,
    "Prospects",
    backupFileName
  );

  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      document.getElementById("messages").innerText =
        "Error reading the original file.";
      return;
    }

    window.electron.gzip(data, (compressionErr, compressedData) => {
      if (compressionErr) {
        document.getElementById("messages").innerText =
          "Error compressing the file.";
        return;
      }

      fs.writeFile(backupFilePath, compressedData, (writeErr) => {
        if (writeErr) {
          document.getElementById("messages").innerText =
            "Error saving the backup.";
          return;
        }

        document.getElementById(
          "messages"
        ).innerText = `Backup successful! Backup saved as ${backupFileName}`;
      });
    });
  });
}

// Detect the actual Steam User
document.addEventListener("DOMContentLoaded", function () {
  detectCurrentUser();
});

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

// Back up the current world save
document.getElementById("backUpBtn").addEventListener("click", createBackup);
