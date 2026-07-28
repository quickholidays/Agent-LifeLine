const fs = require("fs");
const path = require("path");

function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("Missing .env.local");
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, "utf-8");
  const env = {};
  content.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const parts = trimmed.split("=");
      if (parts.length >= 2) {
        env[parts[0].trim()] = parts.slice(1).join("=").trim();
      }
    }
  });
  return env;
}

const env = loadEnv();
const token = env.GITHUB_TOKEN;
const owner = env.GITHUB_OWNER;
const repo = env.GITHUB_REPO;

async function check() {
  const date = "2026-07-27";
  const contentsUrl = `https://api.github.com/repos/${owner}/${repo}/contents/daily_backups/${date}.json`;
  
  // 1. Fetch metadata first
  console.log("Fetching file metadata from contents API...");
  const metadataResponse = await fetch(contentsUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "node-fetch"
    }
  });

  console.log("Metadata Status:", metadataResponse.status);
  if (!metadataResponse.ok) {
    console.error("Failed to get metadata:", await metadataResponse.text());
    return;
  }

  const metadata = await metadataResponse.json();
  const sha = metadata.sha;
  const size = metadata.size;
  console.log(`File SHA: ${sha}, Size: ${size} bytes (${(size / 1024 / 1024).toFixed(2)} MB)`);

  let base64Content = "";

  if (size <= 1000000) {
    console.log("File is 1MB or smaller. Reading content from metadata directly...");
    base64Content = metadata.content;
  } else {
    console.log("File is larger than 1MB. Querying Git Blob API to retrieve complete content...");
    const blobUrl = `https://api.github.com/repos/${owner}/${repo}/git/blobs/${sha}`;
    const blobResponse = await fetch(blobUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "node-fetch"
      }
    });

    console.log("Blob API Status:", blobResponse.status);
    if (!blobResponse.ok) {
      console.error("Failed to get blob content:", await blobResponse.text());
      return;
    }

    const blobData = await blobResponse.json();
    base64Content = blobData.content;
  }

  // Remove any whitespace/newlines from base64 string
  const cleanBase64 = base64Content.replace(/\s/g, "");
  console.log("Clean Base64 Length:", cleanBase64.length);

  const decodedText = Buffer.from(cleanBase64, "base64").toString("utf-8");
  console.log("Decoded Text Length:", decodedText.length);
  console.log("Decoded Text Sample (first 200 chars):");
  console.log(decodedText.slice(0, 200));

  try {
    const parsed = JSON.parse(decodedText);
    console.log("✅ Parsing successful! Agents count:", parsed.agents ? parsed.agents.length : 0);
  } catch (e) {
    console.error("❌ Parsing failed:", e.message);
  }
}

check().catch(console.error);
