const fs = require("fs");
const path = require("path");
const https = require("https");

function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("Missing .env.local file");
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
  const date = "2026-07-28";
  const gitPath = `/repos/${owner}/${repo}/contents/daily_backups/${date}.json`;
  
  console.log(`Downloading daily backup for ${date} from GitHub...`);
  const getRes = await makeGithubRequest("GET", gitPath);
  if (getRes.status !== 200) {
    console.error(`File not found or failed (${getRes.status})`);
    return;
  }
  
  const fileData = JSON.parse(getRes.body);
  const sha = fileData.sha;
  
  let base64Content = "";
  if (fileData.size <= 1000000) {
    base64Content = fileData.content;
  } else {
    const blobRes = await makeGithubRequest("GET", `/repos/${owner}/${repo}/git/blobs/${sha}`);
    if (blobRes.status === 200) {
      base64Content = JSON.parse(blobRes.body).content;
    } else {
      console.error(`Blob fetch failed (${blobRes.status})`);
      return;
    }
  }
  
  const cleanBase64 = base64Content.replace(/\s/g, "");
  const decodedContent = Buffer.from(cleanBase64, "base64").toString("utf-8");
  const report = JSON.parse(decodedContent);
  
  const messages = report.ghl_outbound_messages || report.ghlMessages || [];
  console.log(`Total messages in report: ${messages.length}`);
  
  if (messages.length > 0) {
    console.log("\nSample message timestamps:");
    messages.slice(0, 15).forEach((m, idx) => {
      console.log(`  [${idx}] Agent: "${m.agent}" | Time: "${m.time}" | Contact: "${m.contactName}"`);
    });
  }
}

run().catch(console.error);
