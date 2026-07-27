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

// Helper to make GitHub requests
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

function cleanDetailsString(rawDetails) {
  if (!rawDetails) return "";
  let details = rawDetails;
  if (typeof rawDetails === "string" && rawDetails.startsWith("{") && rawDetails.endsWith("}")) {
    try {
      const parsed = JSON.parse(rawDetails);
      const simplified = {};
      const keysToKeep = [
        "contactName", "name", "contactId", "opportunityId", "id", 
        "pipelineStageName", "status", "title", "description", 
        "email", "phone", "value", "margin", "amount"
      ];
      keysToKeep.forEach(k => {
        if (parsed[k] !== undefined) simplified[k] = parsed[k];
      });
      
      if (parsed.opportunity) {
        simplified.opportunity = {
          id: parsed.opportunity.id,
          name: parsed.opportunity.name,
          status: parsed.opportunity.status,
          pipelineStageId: parsed.opportunity.pipelineStageId
        };
      }
      
      details = JSON.stringify(simplified);
    } catch (e) {
      if (rawDetails.length > 300) details = rawDetails.slice(0, 300);
    }
  } else if (typeof rawDetails === "string" && rawDetails.length > 300) {
    details = rawDetails.slice(0, 300);
  }
  return details;
}

const targetDateStr = "2026-07-27";

// Format in BST
const isTargetDate = (timeVal) => {
  if (!timeVal) return false;
  const d = new Date(timeVal);
  if (isNaN(d.getTime())) return false;
  
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = formatter.formatToParts(d);
  const y = parts.find(p => p.type === "year").value;
  const m = parts.find(p => p.type === "month").value;
  const day = parts.find(p => p.type === "day").value;
  return `${y}-${m}-${day}` === targetDateStr;
};

async function run() {
  const filePath = path.join(__dirname, "downloaded.json");
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found at ${filePath}`);
    return;
  }

  console.log(`Reading bloated JSON from: ${filePath}`);
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const report = JSON.parse(fileContent);
  console.log(`Original JSON size: ${(fileContent.length / 1024 / 1024).toFixed(2)} MB`);

  // 1. Clean top-level audit_logs
  let originalAuditLogsCount = 0;
  if (Array.isArray(report.audit_logs)) {
    originalAuditLogsCount = report.audit_logs.length;
    console.log(`Cleaning top-level audit_logs (Original: ${originalAuditLogsCount})...`);
    
    // Filter to keep only today's logs and shrink details JSON
    report.audit_logs = report.audit_logs
      .filter(act => isTargetDate(act.timestamp || act.time))
      .map(act => {
        return {
          agent: act.agent,
          timestamp: act.timestamp || act.time,
          module: act.module,
          action: act.action,
          details: cleanDetailsString(act.details)
        };
      });
    console.log(`Top-level audit_logs cleaned. (New: ${report.audit_logs.length})`);
  }

  // 2. Clean individual agent action lists
  if (report.agents) {
    const agentNames = Object.keys(report.agents);
    console.log(`Cleaning agent action lists for ${agentNames.length} agents...`);
    agentNames.forEach(agentName => {
      const agent = report.agents[agentName];
      if (agent && Array.isArray(agent.actions_list)) {
        const originalCount = agent.actions_list.length;
        
        agent.actions_list = agent.actions_list
          .filter(act => isTargetDate(act.timestamp || act.time || act.dt))
          .map(act => {
            return {
              agent: act.agent,
              timestamp: act.timestamp || act.time || act.dt,
              module: act.module,
              action: act.action,
              details: cleanDetailsString(act.details)
            };
          });
        console.log(`- ${agentName}: actions_list cleaned (${originalCount} -> ${agent.actions_list.length})`);
      }
    });
  }

  const cleanJsonString = JSON.stringify(report, null, 2);
  console.log(`Cleaned JSON size: ${(cleanJsonString.length / 1024).toFixed(2)} KB`);

  // Overwrite local file
  fs.writeFileSync(filePath, cleanJsonString, "utf-8");
  console.log(`Successfully saved clean local copy back to ${filePath}`);

  // 3. Upload to GitHub
  if (token && owner && repo) {
    const gitPath = `/repos/${owner}/${repo}/contents/daily_backups/${targetDateStr}.json`;
    console.log(`Uploading cleaned JSON to GitHub: daily_backups/${targetDateStr}.json...`);

    let sha = null;
    try {
      const getRes = await makeGithubRequest("GET", gitPath);
      if (getRes.status === 200) {
        sha = JSON.parse(getRes.body).sha;
      }
    } catch (e) {
      console.warn("Could not retrieve SHA, trying create.");
    }

    const contentBase64 = Buffer.from(cleanJsonString).toString("base64");
    const payload = {
      message: `Optimize: clean garbage properties and keep only today's audit logs in daily backup`,
      content: contentBase64
    };
    if (sha) {
      payload.sha = sha;
    }

    const putRes = await makeGithubRequest("PUT", gitPath, payload);
    if (putRes.status === 200 || putRes.status === 201) {
      console.log(`✅ SUCCESS! Overwrote daily backup on GitHub with cleaned, optimized JSON!`);
    } else {
      console.error(`❌ FAILED to upload to GitHub (${putRes.status}): ${putRes.body}`);
    }
  }
}

run().catch(console.error);
