const fs = window.electron.fs;
const path = window.electron.path;
const dialog = window.electron.dialog;
const dropboxV2Api = window.electron.dropboxV2Api;

const config = window.electron.config;
const DROPBOX_TOKEN = config.DROPBOX_TOKEN;

const LOCALAPPDATA = window.electron.env.LOCALAPPDATA;
const zlib = window.electron.zlib;
const { Buffer } = window.electron;

const dropbox = dropboxV2Api.authenticate({
  token: DROPBOX_TOKEN,
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
        path: "/Icarus/Nebula Nokedli.json",
      },
    },
    (err, result) => {
      if (err) {
        document.getElementById(
          "messages"
        ).innerText = `Error checking for newer version: ${
          err.error_summary || err
        }`; // Using error_summary from Dropbox's error object, or default to the whole error object.
        return;
      }

      try {
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
      } catch (fsErr) {
        document.getElementById(
          "messages"
        ).innerText = `Filesystem error: ${fsErr.message}`;
      }
    }
  );
}

function createBackupForFile(filePath) {
  const messagesElem = document.getElementById("messages");
  try {
    const today = new Date();
    const dateStr = `${today.getFullYear()}_${
      today.getMonth() + 1
    }_${today.getDate()}_${today.getHours()}h${today.getMinutes()}m${today.getSeconds()}s`;
    const backupFileName =
      path.basename(filePath, path.extname(filePath)) +
      `_${dateStr}_backUp` +
      path.extname(filePath);

    // Path for the backup file
    const backupFilePath = path.join(path.dirname(filePath), backupFileName);

    // Copy the file to a backup
    fs.copyFileSync(filePath, backupFilePath);

    messagesElem.innerHTML = `<span class="label">Backup Status:</span> <span class="value">Success! Backup created at ${backupFilePath}</span>`;
    return backupFilePath;
  } catch (error) {
    messagesElem.innerHTML = `<span class="label">Backup Error:</span> <span class="value">Failed to create backup for ${filePath}. Reason: ${error.message}</span>`;
    return null; // Indicating that the backup wasn't successful
  }
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
        path: "/Icarus/Nebula Nokedli.json",
      },
    },
    (err, result, response) => {
      if (err) {
        document.getElementById("messages").innerText = `Error downloading: ${
          err.error_summary || JSON.stringify(err)
        }`;
        return;
      }
      console.log(response);

      const localFilePath = path.join(
        LOCALAPPDATA,
        "Icarus/Saved/PlayerData",
        detectedSteamID,
        "Prospects",
        "Nebula Nokedli.json"
      );

      // Before overwriting, backup the existing file.
      // TODO Need to create a switch for this on the UI
      //createBackupForFile(localFilePath);

      // Write the new downloaded content.
      if (response && response.data) {
        fs.writeFileSync(localFilePath, response.data); // Using `response.data` since that's where the actual file content (buffer) is.
      } else {
        document.getElementById("messages").innerText =
          "Unexpected response format from Dropbox.";
        return;
      }

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
    "Prospects",
    "Nebula Nokedli.json"
  );

  //   const readStream = window.electron.fs.createReadStream(localFilePath);
  //   readStream.on("error", (err) => {
  //     document.getElementById("messages").innerText =
  //       "Error reading file: " + err.message;
  //   });

  // Read the file's content into memory
  const fileContent = fs.readFileSync(localFilePath, "utf8");

  console.log(`File size: ${fileContent.length}`);
  // DEBUG
  //   console.log(fileContent);
  //   const debugFilePath = path.join(
  //     LOCALAPPDATA,
  //     "Icarus/Saved/PlayerData",
  //     detectedSteamID,
  //     "Prospects",
  //     "debugFile.json"
  //   );
  //   fs.writeFileSync(debugFilePath, fileContent);

  dropbox(
    {
      resource: "files/upload",
      parameters: {
        path: "/Icarus/Nebula Nokedli.json",
        mode: "overwrite",
      },
      body: fileContent,
      //   body: Buffer.from(fileContent),
      headers: {
        // "Content-Type": "application/octet-stream",
      },
    },
    (err, result) => {
      if (err) {
        document.getElementById(
          "messages"
        ).innerText = `Error uploading: ${JSON.stringify(err)}`;
        return;
      }
      //   document.getElementById("messages").innerText = "Upload successful!";
      document.getElementById(
        "messages"
      ).innerText = `Upload successful! Response: ${JSON.stringify(result)}`;
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
  // Path for the original prospect file
  const filePath = path.join(
    LOCALAPPDATA,
    "Icarus/Saved/PlayerData",
    detectedSteamID,
    "Prospects",
    "Nebula Nokedli.json"
  );

  // Create the backup
  const backupPath = createBackupForFile(filePath);
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
