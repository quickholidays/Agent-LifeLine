const fs = require("fs");
const path = require("path");
const https = require("https");

// Helper to parse .env.local
function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("Missing .env.local file in project root.");
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, "utf-8");
  const env = {};
  content.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const parts = trimmed.split("=");
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts.slice(1).join("=").trim();
        env[key] = val;
      }
    }
  });
  return env;
}

const env = loadEnv();
const GITHUB_TOKEN = env.GITHUB_TOKEN;
const GITHUB_OWNER = env.GITHUB_OWNER;
const GITHUB_REPO = env.GITHUB_REPO;

// Helper to make HTTPS requests to GitHub
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

async function cleanJsonFile(fileName) {
  const filePath = path.join("/home/talha-sami/Downloads", fileName);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  console.log(`Processing file: ${filePath}`);
  const rawContent = fs.readFileSync(filePath, "utf-8");
  const report = JSON.parse(rawContent);

  const filterMessages = (messagesList) => {
    if (!Array.isArray(messagesList)) return [];
    return messagesList.filter((m) => {
      const bodyTrimmed = String(m.body || "").trim();
      const bodyLower = bodyTrimmed.toLowerCase();
      
      const isOpportunityLog = bodyLower.includes("opportunity updated") || 
                               bodyLower.includes("opportunity created") || 
                               bodyLower.includes("opportunity stage updated");
      const isPlaceholderSms = bodyLower === "[sms message]" || bodyLower === "" || bodyTrimmed.length === 0;

      return !isOpportunityLog && !isPlaceholderSms;
    });
  };

  const originalCount = report.ghl_outbound_messages ? report.ghl_outbound_messages.length : 0;
  
  report.ghl_outbound_messages = filterMessages(report.ghl_outbound_messages || report.ghlMessages);
  report.ghlMessages = report.ghl_outbound_messages;

  const newCount = report.ghl_outbound_messages.length;
  console.log(`Filtered out ${originalCount - newCount} placeholder/opportunity messages. (${originalCount} -> ${newCount})`);

  const updatedJsonString = JSON.stringify(report, null, 2);
  
  // 1. Overwrite local file in Downloads folder
  fs.writeFileSync(filePath, updatedJsonString, "utf-8");
  console.log(`Saved clean local copy to: ${filePath}`);

  // 2. Push cleaned copy back to GitHub record-json-backup repo
  if (GITHUB_TOKEN && GITHUB_OWNER && GITHUB_REPO) {
    const gitPath = `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/daily_backups/${fileName}`;
    console.log(`Uploading cleaned report to GitHub: ${GITHUB_OWNER}/${GITHUB_REPO}/daily_backups/${fileName}...`);
    
    // Fetch current SHA if exists
    let sha = null;
    try {
      const getRes = await makeGithubRequest("GET", gitPath);
      if (getRes.status === 200) {
        const getBody = JSON.parse(getRes.body);
        sha = getBody.sha;
      }
    } catch (e) {
      console.warn("Could not retrieve file SHA from GitHub. Will try creating a new file.");
    }

    const contentBase64 = Buffer.from(updatedJsonString).toString("base64");
    const payload = {
      message: `Clean placeholder and opportunity messages for ${fileName.replace(".json", "")}`,
      content: contentBase64
    };
    if (sha) {
      payload.sha = sha;
    }

    const putRes = await makeGithubRequest("PUT", gitPath, payload);
    if (putRes.status === 200 || putRes.status === 201) {
      console.log(`✅ Successfully updated GitHub report for ${fileName}`);
    } else {
      console.error(`❌ Failed to update GitHub report (${putRes.status}): ${putRes.body}`);
    }
  } else {
    console.warn("Skipping GitHub upload: GITHUB_TOKEN or GITHUB_REPO environment variables are missing.");
  }
  console.log("");
}

async function run() {
  await cleanJsonFile("2026-07-25.json");
  await cleanJsonFile("2026-07-27.json");
}

run().catch((e) => {
  console.error("Cleaning failed:", e.message);
});
