const fs = require("fs");
const path = require("path");
const https = require("https");

function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env.local");
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
const GITHUB_TOKEN = env.GITHUB_TOKEN;
const owner = env.GITHUB_OWNER;
const repo = env.GITHUB_REPO;

console.log("Token:", GITHUB_TOKEN ? "exists" : "missing");
console.log("Owner:", owner);
console.log("Repo:", repo);

function makeGithubRequest(method, urlPath, payloadObj = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.github.com",
      path: urlPath,
      method: method,
      headers: {
        "User-Agent": "antigravity-agent",
        "Authorization": `Bearer ${GITHUB_TOKEN}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json"
      }
    };

    console.log("Sending request to:", options.hostname + options.path);

    const req = https.request(options, (res) => {
      console.log("Response status:", res.statusCode);
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        resolve({
          status: res.statusCode,
          body: data
        });
      });
    });

    req.on("error", (e) => {
      console.error("Request error:", e);
      reject(e);
    });

    if (payloadObj) {
      req.write(JSON.stringify(payloadObj));
    }
    req.end();
  });
}

const gitPath = `/repos/${owner}/${repo}/contents/daily_backups/2026-07-26.json`;

makeGithubRequest("GET", gitPath)
  .then((res) => {
    console.log("Result status:", res.status);
    console.log("Result body length:", res.body.length);
  })
  .catch((err) => {
    console.error("Caught error:", err);
  });
