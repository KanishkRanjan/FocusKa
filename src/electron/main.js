import { app, BrowserWindow, ipcMain } from "electron";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import resourceManager, { getGitInfo } from "./resourceManager.js";
import process from "process";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function init() {
  try {
    const gitFiles = await getGitInfo();
    console.log("Git files fetched:", gitFiles);
    const doc = {
      questionSolved: gitFiles.length,
      questionName: gitFiles.join(", ") || "",
      timeSpent: gitFiles.length > 0 ? 0 : 0, // only set timeSpent when no files
    };
    console.log(
      gitFiles.length > 0
        ? `Git files changed today: ${gitFiles}`
        : "No git files changed today."
    );
    await resourceManager.writeOnDB(doc);
  } catch (error) {
    console.error("Error during initialization:", error);
    await resourceManager.writeOnDB({
      questionSolved: 0,
      timeSpent: 0,
      questionName: "Initialization error",
    });
  }
}

async function createWindow() {
  const mainWindow = new BrowserWindow({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: join(__dirname, "preload.cjs"),
    },
  });

  if (process.env.NODE_ENV === "development") {
    await mainWindow.loadURL("http://localhost:5123");
  } else {
    await mainWindow.loadFile(join(app.getAppPath(), "dist-react/index.html"));
  }

  console.log("App loaded with preload:", join(__dirname, "preload.cjs"));
}

function setupIPC() {
  ipcMain.handle("getQuestions", () => resourceManager.getQuestions() || []);

  ipcMain.handle("getTimeLeft", () => resourceManager.getTimeLeft());

  ipcMain.handle("reset", init);

  ipcMain.handle("getQuestionSolved", async () => {
    const questionSolved = await resourceManager.getQuestionSolved();
    if (questionSolved <= 0) {
      console.warn("No questions solved yet!");
      return 0;
    }
    return questionSolved;
  });

  ipcMain.handle("block", async () => {
    await resourceManager.block();
    console.log("Blocking done!");
    return true;
  });

  ipcMain.handle("unblock", async () => {
    await resourceManager.unblock();
    console.log("Unblocking done!");
    return true;
  });
}

app.whenReady().then(async () => {
  await init();
  await createWindow();
  setupIPC();

  try {
    await resourceManager.block(); // Block on startup
    console.log("Initial block completed.");
  } catch (error) {
    console.error("Failed to block on startup:", error);
  }
});

app.on("before-quit", async () => {
  try {
    await resourceManager.block(); // Ensure unblocking on quit
    console.log("Blocking before quitting.");
  } catch (error) {
    console.error("Failed to unblock before quitting:", error);
  }
});