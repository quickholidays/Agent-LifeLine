const fs = require("fs");
const path = require("path");
const https = require("https");

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

function makeGithubRequest(method, urlPath, payloadObj = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.github.com",
      path: urlPath,
      method: method,
      headers: {
        "User-Agent": "antigravity-agent",
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json"
      }
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        resolve({
          status: res.statusCode,
          body: data
        });
      });
    });

    req.on("error", (e) => reject(e));
    if (payloadObj) {
      req.write(JSON.stringify(payloadObj));
    }
    req.end();
  });
}

async function run() {
  const targetDateStr = "2026-07-28"; // Let's check both 27 and 28
  const datesToCheck = ["2026-07-28", "2026-07-27"];
  
  for (const date of datesToCheck) {
    const filePath = `daily_backups/${date}.json`;
    console.log(`\n=== Checking commits for file: ${filePath} ===`);
    
    const commitsPath = `/repos/${owner}/${repo}/commits?path=${filePath}`;
    const res = await makeGithubRequest("GET", commitsPath);
    if (res.status !== 200) {
      console.error(`Failed to get commits for ${date} (${res.status}): ${res.body}`);
      continue;
    }
    
    const commits = JSON.parse(res.body);
    console.log(`Found ${commits.length} commits modifying this file.`);
    
    commits.forEach((c, idx) => {
      console.log(`[Commit ${idx}] SHA: ${c.sha} | Date: ${c.commit.author.date} | Message: ${c.commit.message}`);
    });
  }
}

run().catch(console.error);
