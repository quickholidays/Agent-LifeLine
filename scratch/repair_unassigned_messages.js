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
  console.log(`Total messages in backup: ${messages.length}`);
  
  let resolvedCount = 0;
  
  // 1. Build lookup dictionaries for fast mapping
  const contactToAgentMap = {};
  
  // Strategy A: Map contact name from call logs
  if (Array.isArray(report.calls)) {
    report.calls.forEach(c => {
      if (c.contact_name && c.agent && c.agent.toLowerCase() !== "unassigned") {
        contactToAgentMap[c.contact_name.trim().toLowerCase()] = c.agent;
      }
    });
  }
  
  // Strategy B: Map contact name from agent segmentations
  if (report.agents && typeof report.agents === "object" && !Array.isArray(report.agents)) {
    Object.entries(report.agents).forEach(([agentName, stats]) => {
      if (agentName.toLowerCase() === "unassigned") return;
      
      const checkList = [
        ...(stats.new_leads_details || []),
        ...(stats.booked_leads_details || []),
        ...(stats.appt_booked_leads_details || []),
        ...(stats.closed_leads_details || []),
        ...(stats.today_conversion_leads || [])
      ];
      
      checkList.forEach(lead => {
        const leadName = (lead.name || "").trim().toLowerCase();
        if (leadName && leadName !== "unknown") {
          contactToAgentMap[leadName] = agentName;
        }
      });
    });
  }
  
  console.log(`Mapped ${Object.keys(contactToAgentMap).length} contacts to active agents.`);
  
  // 2. Resolve each message's agent
  messages.forEach(m => {
    if (!m.agent || m.agent.toLowerCase() === "unassigned") {
      const contactNameClean = (m.contactName || "").trim().toLowerCase();
      
      // Look in our compiled lookup map
      let matchedAgent = contactToAgentMap[contactNameClean];
      
      // Strategy C: If still not found, check if contactName appears in agent audit logs
      if (!matchedAgent && report.agents && typeof report.agents === "object" && !Array.isArray(report.agents)) {
        for (const [agentName, stats] of Object.entries(report.agents)) {
          if (agentName.toLowerCase() === "unassigned") continue;
          
          if (Array.isArray(stats.actions_list)) {
            const hasAction = stats.actions_list.some(act => {
              const detailsStr = String(act.details || "").toLowerCase();
              return detailsStr.includes(contactNameClean);
            });
            if (hasAction) {
              matchedAgent = agentName;
              break;
            }
          }
        }
      }
      
      if (matchedAgent) {
        m.agent = matchedAgent;
        resolvedCount++;
      }
    }
  });
  
  // Sync both keys
  report.ghl_outbound_messages = messages;
  report.ghlMessages = messages;
  
  console.log(`Successfully resolved ${resolvedCount} out of ${messages.length} messages.`);
  
  // Write back local copy for backup/verification
  const localFile = path.join(__dirname, "repaired_report.json");
  fs.writeFileSync(localFile, JSON.stringify(report, null, 2), "utf-8");
  console.log(`Saved local copy of repaired report to ${localFile}`);
  
  // 3. Push back to GitHub
  console.log(`Uploading repaired report to GitHub...`);
  const putPayload = {
    message: `chore: repair and assign ${resolvedCount} GHL webhook messages to their correct agents`,
    content: Buffer.from(JSON.stringify(report, null, 2)).toString("base64"),
    sha: sha
  };
  
  const putRes = await makeGithubRequest("PUT", gitPath, putPayload);
  if (putRes.status === 200 || putRes.status === 201) {
    console.log(`✅ SUCCESS! Overwrote backup on GitHub with repaired agent assignments!`);
  } else {
    console.error(`❌ FAILED to upload repaired backup (${putRes.status}): ${putRes.body}`);
  }
}

run().catch(console.error);
