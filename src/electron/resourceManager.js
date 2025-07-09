import mongoose from "mongoose";
import fs from "fs";
import psList from "ps-list";
import fkill from "fkill";
import { exec } from "child_process";
import fetch from "node-fetch";

import process from "process";

// ✅ MongoDB Atlas connection
const MONGO_URI = "mongodb+srv://kanishkranjan17:capnin@leaderboard.5gmx8.mongodb.net/?retryWrites=true&w=majority&appName=leaderboard";
await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// ✅ MongoDB schema & model
const FocusSchema = new mongoose.Schema({
  date: { type: String, required: true },
  questionSolved: Number,
  timeSpent: Number,
  questionName: String,
});
const FocusEntry = mongoose.model("FocusEntry", FocusSchema);

// ⏱️ Utility
const getToday = () => new Date().toISOString().slice(0, 10);

const blockedApps = [];
const blocked = [
  "facebook.com",
  "youtube.com",
  "instagram.com",
  "in.pinterest.com",
  "mail.google.com",
  "linkedin.com",
];

// 🔒 App Blocking
export async function blockApps() {
  try {
    const processes = await psList();
    const toKill = processes.filter((p) =>
      blockedApps.some((name) => p.name.toLowerCase().includes(name.toLowerCase()))
    );
    if (toKill.length > 0) {
      console.log("Blocking apps:", toKill.map((p) => p.name));
      await Promise.all(toKill.map((p) => fkill(p.pid, { force: true })));
    } else {
      console.log("No blocked apps running.");
    }
  } catch (error) {
    console.error("Failed to block apps:", error);
  }
}

// 💾 Write or Update
export async function writeOnDB(newData) {
  console.log("Writing to DB:", newData);
  try {
    const today = getToday();
    let doc = await FocusEntry.findOne({ date: today });
    if (doc) {
      doc.questionSolved = newData.questionSolved;
      doc.questionName = newData.questionName;
      doc.timeSpent = doc.timeSpent ?? 0;
      await doc.save();
      console.log("Updated existing doc.");
    } else {
      const newDoc = new FocusEntry({
        date: today,
        questionSolved: newData.questionSolved,
        timeSpent: newData.timeSpent,
        questionName: newData.questionName,
      });
      await newDoc.save();
      console.log("Created new doc.");
    }
  } catch (error) {
    console.error("Error writing to DB:", error);
  }
}

// ⏳ Time Tracking
export async function addTimeSpend() {
  try {
    const today = getToday();
    let doc = await FocusEntry.findOne({ date: today });
    if (doc) {
      doc.timeSpent += 1;
      await doc.save();
    } else {
      const newDoc = new FocusEntry({
        date: today,
        timeSpent: 1,
        questionSolved: 0,
        questionName: "",
      });
      await newDoc.save();
    }
  } catch (error) {
    console.error("Error adding timeSpent:", error);
  }
}

// ⏰ Time Left Calculation
export async function getTimeLeft() {
  const timeSpent = await getTimeSpend();
  const questionSolved = await getQuestionSolved();
  const timeLeft = questionSolved * 60 * 10 - timeSpent;
  return timeLeft <= 0 ? 0 : timeLeft;
}

export async function getGitInfo() {
  console.log("Fetching GitHub info...");
  try {
    const repo = "https://api.github.com/repos/KanishkRanjan/Capnin-ICPC-Journey";
    const token = process.env.GITHUB_TOKEN;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const since = today.toISOString();

    const commitsRes = await fetch(`${repo}/commits?since=${since}`, {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json"
      }
    });

    if (!commitsRes.ok) {
      throw new Error(`GitHub API error: ${commitsRes.status} ${commitsRes.statusText}`);
    }

    const commits = await commitsRes.json();
    const solvedToday = new Set();

    for (const commit of commits) {
      const sha = commit.sha;
      const commitRes = await fetch(`${repo}/commits/${sha}`, {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json"
        }
      });
      const detail = await commitRes.json();
      detail?.files?.forEach((file) => {
        if (file.filename.endsWith(".cpp")) solvedToday.add(file.filename);
      });
    }

    return Array.from(solvedToday);
  } catch (error) {
    console.error("Error fetching GitHub info:", error);
    return [];
  }
}

// 🔒 Site Blocking
const backupFile = "./hosts_backup";

export async function block() {
  try {
    if (!fs.existsSync(backupFile)) {
      fs.copyFileSync("/etc/hosts", backupFile);
    }
    let hosts = fs.readFileSync("/etc/hosts", "utf-8").trim();
    if (!hosts.endsWith("\n")) hosts += "\n";
    blocked.forEach((site) => {
      if (!hosts.includes(`127.0.0.1 ${site}`)) {
        hosts += `127.0.0.1 ${site}\n127.0.0.1 www.${site}\n`;
      }
    });
    fs.writeFileSync("/etc/hosts", hosts);
    blockApps();
    exec("sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder");
  } catch (err) {
    console.error("Error blocking sites:", err.message);
  }
}

export async function unblock() {
  const timeLeft = await getTimeLeft();
  if (timeLeft <= 0) return console.error("Time limit exceeded, cannot unblock sites!");
  const timeSpender = setInterval(async () => {
    await addTimeSpend();
    const left = await getTimeLeft();
    console.log("Time spent incremented. Time left:", left);
  }, 1000);
  try {
    if (fs.existsSync(backupFile)) {
      fs.copyFileSync(backupFile, "/etc/hosts");
      exec("sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder");
    } else {
      console.error("No backup file found!");
    }
  } catch (err) {
    console.error("Error restoring backup:", err.message);
  }
  setTimeout(async () => {
    clearInterval(timeSpender);
    console.log("Blocking again...");
    await block();
  }, timeLeft * 1000 + 1000);
}

// 📊 DB Getters
export async function getTimeSpend() {
  const today = getToday();
  const doc = await FocusEntry.findOne({ date: today });
  return doc ? doc.timeSpent : 0;
}

export async function getQuestionSolved() {
  const today = getToday();
  const doc = await FocusEntry.findOne({ date: today });
  return doc ? doc.questionSolved : 0;
}

export async function getAll() {
  return await FocusEntry.find();
}

export async function getQuestionName() {
  const today = getToday();
  const doc = await FocusEntry.findOne({ date: today });
  return doc?.questionName?.split(", ") || [];
}

export default {
  getQuestions: () => getQuestionName(),
  writeOnDB,
  addTimeSpend,
  getTimeSpend,
  getQuestionSolved,
  getAll,
  getGitInfo,
  getTimeLeft,
  block,
  unblock,
};
