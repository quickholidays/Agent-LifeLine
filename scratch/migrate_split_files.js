const fs = require("fs");
const path = require("path");
const https = require("https");

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

async function makeGithubRequest(method, urlPath, payloadObj = null) {
  const url = `https://api.github.com${urlPath}`;
  const options = {
    method: method,
    headers: {
      "User-Agent": "antigravity-agent",
      "Authorization": `Bearer ${GITHUB_TOKEN}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json"
    }
  };
  if (payloadObj) {
    options.body = JSON.stringify(payloadObj);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  options.signal = controller.signal;

  try {
    const res = await fetch(url, options);
    const text = await res.text();
    return {
      status: res.status,
      body: text
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runMigration() {
  console.log("=== STARTING HISTORICAL DATA SPLIT MIGRATION ===\n");

  // 1. Migrate Local Test-Data files
  console.log("Checking local Test-Data files...");
  const localDir = path.join(__dirname, "..", "Test-Data");
  if (fs.existsSync(localDir)) {
    try {
      const files = fs.readdirSync(localDir);
      for (const f of files) {
        if (f.startsWith("lifeline_report_") && f.endsWith(".json") && !f.startsWith("lifeline_report_messages_")) {
          const filePath = path.join(localDir, f);
          const raw = fs.readFileSync(filePath, "utf-8");
          const report = JSON.parse(raw);

          const msgs = report.ghl_outbound_messages || report.ghlMessages || [];
          if (msgs.length > 0) {
            const dateStr = f.replace("lifeline_report_", "").replace(".json", "");
            const msgsFilePath = path.join(localDir, `lifeline_report_messages_${dateStr}.json`);

            // Save messages
            const msgsPayload = {
              ghl_outbound_messages: msgs,
              ghlMessages: msgs,
              summary: { total_ghl_messages: msgs.length }
            };
            fs.writeFileSync(msgsFilePath, JSON.stringify(msgsPayload, null, 2), "utf-8");

            // Strip core file
            delete report.ghl_outbound_messages;
            delete report.ghlMessages;
            fs.writeFileSync(filePath, JSON.stringify(report, null, 2), "utf-8");

            console.log(`[Local] Successfully split messages from ${f}`);
          }
        }
      }
    } catch (err) {
      console.error("Local migration error:", err);
    }
  }

  if (!GITHUB_TOKEN || !owner || !repo) {
    console.log("\nGitHub configurations are not complete in .env.local. Skipping GitHub migration.");
    return;
  }

  // 2. Migrate remote GitHub files
  console.log("\nChecking remote GitHub files...");
  const listRes = await makeGithubRequest("GET", `/repos/${owner}/${repo}/contents/daily_backups`);
  if (listRes.status !== 200) {
    console.error(`Failed to list GitHub directory: ${listRes.status} ${listRes.body}`);
    return;
  }

  const files = JSON.parse(listRes.body);
  const targetFiles = files.filter(f => f.type === "file" && f.name.endsWith(".json") && !f.name.startsWith("messages_"));

  console.log(`Found ${targetFiles.length} candidate reports on GitHub.`);

  for (const fileMetadata of targetFiles) {
    const fileName = fileMetadata.name;
    const dateStr = fileName.replace(".json", "");
    console.log(`Checking ${fileName} on GitHub...`);

    try {
      // Fetch file content
      const fileRes = await makeGithubRequest("GET", `/repos/${owner}/${repo}/contents/daily_backups/${fileName}`);
      if (fileRes.status !== 200) {
        console.error(`Failed to download ${fileName}: ${fileRes.status}`);
        continue;
      }

      const fileData = JSON.parse(fileRes.body);
      let base64Content = fileData.content;
      if (!base64Content) {
        // Large file, fetch blob
        const blobRes = await makeGithubRequest("GET", `/repos/${owner}/${repo}/git/blobs/${fileData.sha}`);
        if (blobRes.status === 200) {
          base64Content = JSON.parse(blobRes.body).content;
        }
      }

      if (!base64Content) {
        console.error(`Could not retrieve content for ${fileName}`);
        continue;
      }

      const cleanBase64 = base64Content.replace(/\s/g, "");
      const decoded = Buffer.from(cleanBase64, "base64").toString("utf-8");
      const report = JSON.parse(decoded);

      const msgs = report.ghl_outbound_messages || report.ghlMessages || [];
      if (msgs.length > 0) {
        console.log(`Splitting ${msgs.length} messages from ${fileName} on GitHub...`);

        // 1. Upload messages file
        const msgsPayload = {
          ghl_outbound_messages: msgs,
          ghlMessages: msgs,
          summary: { total_ghl_messages: msgs.length }
        };
        const msgsPutPath = `/repos/${owner}/${repo}/contents/daily_backups/messages_${fileName}`;
        
        // Check if messages file already exists to get SHA (in case of retry)
        let msgSha = null;
        const checkMsgRes = await makeGithubRequest("GET", msgsPutPath);
        if (checkMsgRes.status === 200) {
          msgSha = JSON.parse(checkMsgRes.body).sha;
        }

        const msgsPutPayload = {
          message: `chore: migrate split messages for date ${dateStr}`,
          content: Buffer.from(JSON.stringify(msgsPayload, null, 2)).toString("base64")
        };
        if (msgSha) msgsPutPayload.sha = msgSha;

        const putMsgRes = await makeGithubRequest("PUT", msgsPutPath, msgsPutPayload);
        if (putMsgRes.status !== 200 && putMsgRes.status !== 201) {
          console.error(`Failed to commit messages for ${dateStr}: ${putMsgRes.body}`);
          continue;
        }
        console.log(`[GitHub] Successfully committed daily_backups/messages_${fileName}`);

        // 2. Commit stripped core report file
        delete report.ghl_outbound_messages;
        delete report.ghlMessages;

        const corePutPayload = {
          message: `chore: strip conversation messages from core report for date ${dateStr}`,
          content: Buffer.from(JSON.stringify(report, null, 2)).toString("base64"),
          sha: fileData.sha
        };

        const putCoreRes = await makeGithubRequest("PUT", `/repos/${owner}/${repo}/contents/daily_backups/${fileName}`, corePutPayload);
        if (putCoreRes.status !== 200 && putCoreRes.status !== 201) {
          console.error(`Failed to commit stripped core report for ${dateStr}: ${putCoreRes.body}`);
          continue;
        }
        console.log(`[GitHub] Successfully stripped messages from daily_backups/${fileName}`);
        
        await sleep(1000); // Throttling
      } else {
        console.log(`${fileName} already split / has no messages.`);
      }
    } catch (loopErr) {
      console.error(`Error processing file ${fileName}:`, loopErr);
    }
  }

  console.log("\n=== SPLIT MIGRATION COMPLETE ===");
}

runMigration().catch(err => console.error("Migration failed:", err));
