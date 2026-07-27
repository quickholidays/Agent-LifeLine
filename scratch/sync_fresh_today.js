const fs = require("fs");
const path = require("path");

// Helper to load env variables from .env.local
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
const GHL_TOKEN = env.GHL_TOKEN;
const GHL_LOCATION_ID = env.GHL_LOCATION_ID;
const GITHUB_TOKEN = env.GITHUB_TOKEN;
const GITHUB_OWNER = env.GITHUB_OWNER;
const GITHUB_REPO = env.GITHUB_REPO;

// Helper to sleep/delay execution
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper to make GHL API requests with retries
async function queryGhl(endpoint, params = {}) {
  const url = new URL(`https://services.leadconnectorhq.com${endpoint}`);
  Object.keys(params).forEach((key) => {
    if (params[key] !== undefined && params[key] !== null) {
      url.searchParams.append(key, String(params[key]));
    }
  });

  let attempts = 0;
  while (attempts < 3) {
    attempts++;
    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${GHL_TOKEN}`,
          "Version": "2021-04-15",
          "Accept": "application/json",
          "Content-Type": "application/json"
        }
      });

      if (response.status === 429) {
        console.warn(`[GHL Rate Limit 429] Waiting 5 seconds to retry...`);
        await sleep(5000);
        continue;
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`GHL Error (${response.status}): ${errText}`);
      }

      return response.json();
    } catch (e) {
      if (attempts >= 3) throw e;
      console.warn(`[GHL Connection Warn] Fetch failed: ${e.message}. Retrying in 2 seconds...`);
      await sleep(2000);
    }
  }
}

// Helper to make GitHub requests
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

  const response = await fetch(url, options);
  const data = await response.text();
  return {
    status: response.status,
    body: data
  };
}

async function runFreshSync() {
  const dateStr = "2026-07-27";
  console.log(`=== RUNNING FRESH SYNC FOR DATE: ${dateStr} ===\n`);

  if (!GHL_TOKEN || !GHL_LOCATION_ID) {
    console.error("Missing GHL credentials in .env.local.");
    return;
  }

  // 1. Fetch Users from GHL
  console.log("Fetching GHL user map...");
  const usersData = await queryGhl("/users/", { locationId: GHL_LOCATION_ID });
  const userMap = {};
  if (usersData.users) {
    usersData.users.forEach((u) => {
      userMap[u.id] = u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim();
    });
  }
  console.log(`Loaded ${Object.keys(userMap).length} users.\n`);

  // 2. Fetch Conversations active today
  const outboundMessages = [];
  const activeAgents = new Set();
  let currentStartAfterDate = null;
  let pageCount = 0;
  let hasMore = true;

  const parseToLocalDate = (dateVal) => {
    if (!dateVal) return "";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "";
    // Format in London/BST timezone
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
    return `${y}-${m}-${day}`;
  };

  while (hasMore && pageCount < 50) {
    pageCount++;
    const params = {
      locationId: GHL_LOCATION_ID,
      limit: 25,
      status: "all",
      sortBy: "last_message_date",
      sort: "desc"
    };
    if (currentStartAfterDate) {
      params.startAfterDate = currentStartAfterDate;
    }

    console.log(`Fetching conversations search page ${pageCount}...`);
    const convData = await queryGhl("/conversations/search", params);
    const conversations = convData.conversations || [];
    if (conversations.length === 0) break;

    let foundOlder = false;

    for (const c of conversations) {
      const lastMsgDate = c.lastMessageDate || c.dateUpdated || c.dateCreated;
      if (!lastMsgDate) continue;

      const lastMsgDateStr = parseToLocalDate(lastMsgDate);

      if (lastMsgDateStr === dateStr) {
        // Delay 500ms between calls to avoid hitting GHL API rate limit
        await sleep(500);
        
        // Fetch messages for this thread
        const msgData = await queryGhl(`/conversations/${c.id}/messages`, { limit: 50 });
        const messages = (msgData.messages && msgData.messages.messages) || [];

        if (Array.isArray(messages)) {
          messages.forEach((m) => {
            const msgDateStr = parseToLocalDate(m.dateAdded);
            const typeLower = String(m.type || m.messageType || "").toLowerCase();
            const isCall = typeLower.includes("call") || typeLower.includes("phone");
            const isEmail = typeLower.includes("email");
            const isOutbound = m.direction === "outbound";

            const bodyTrimmed = String(m.body || "").trim();
            const bodyLower = bodyTrimmed.toLowerCase();
            const isOpportunityLog = bodyLower.includes("opportunity updated") || 
                                     bodyLower.includes("opportunity created") || 
                                     bodyLower.includes("opportunity stage updated");
            const isPlaceholderSms = bodyLower === "[sms message]" || bodyLower === "" || bodyTrimmed.length === 0;

            if (msgDateStr === dateStr && isOutbound && !isCall && !isEmail && !isOpportunityLog && !isPlaceholderSms) {
              const msgUserId = m.userId || c.assignedTo;
              const msgAgentName = userMap[msgUserId] || "Unassigned";

              if (msgAgentName && msgAgentName !== "Unassigned") {
                activeAgents.add(msgAgentName);
              }

              let cleanBody = m.body;
              if (cleanBody && (cleanBody.includes("<p>") || cleanBody.includes("<br") || cleanBody.includes("</div>") || cleanBody.includes("<html>"))) {
                cleanBody = cleanBody.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
              }

              outboundMessages.push({
                id: m.id,
                agent: msgAgentName,
                time: new Date(m.dateAdded).toISOString(),
                body: cleanBody,
                contactName: c.fullName || "GHL Contact",
                type: "sms"
              });
            }
          });
        }
      } else if (new Date(lastMsgDate) < new Date(new Date().setHours(0,0,0,0) - 24 * 60 * 60 * 1000 * 2)) {
        foundOlder = true;
      }
    }

    if (foundOlder) {
      console.log("Found older conversations. Stopping pagination.");
      break;
    }

    const lastItem = conversations[conversations.length - 1];
    currentStartAfterDate = lastItem.lastMessageDate || lastItem.dateUpdated || lastItem.dateCreated;
  }

  console.log(`\nFound ${outboundMessages.length} GHL outbound SMS messages.`);
  console.log("Extracted agents:", Array.from(activeAgents));

  // 3. Build the fresh JSON report structure
  const agentsArray = Array.from(activeAgents).map((agentName) => {
    return {
      name: agentName,
      calls_placed: 0,
      interacted_leads_today: 0,
      interacted_conversions_today: 0,
      total_actions: 0,
      segmentations: {
        newLeads: 0,
        bookedLeads: 0,
        apptBookedLeads: 0,
        closedLeads: 0,
        newLeadsToday: 0,
        bookedLeadsToday: 0,
        apptBookedLeadsToday: 0
      },
      call_metrics: {
        outboundCount: 0,
        outboundAttended: 0,
        outboundMissed: 0,
        outboundMinutes: 0,
        outboundAvgDuration: 0,
        inboundCount: 0,
        inboundAttended: 0,
        inboundMissed: 0,
        inboundMinutes: 0,
        inboundAvgDuration: 0
      },
      calls: [],
      actions_list: []
    };
  });

  const freshReport = {
    agents: agentsArray,
    calls: [],
    audit_logs: [],
    ghl_outbound_messages: outboundMessages,
    ghlMessages: outboundMessages
  };

  const jsonString = JSON.stringify(freshReport, null, 2);

  // 4. Overwrite file in Downloads folder
  const localDownloadsPath = path.join("/home/talha-sami/Downloads", `${dateStr}.json`);
  fs.writeFileSync(localDownloadsPath, jsonString, "utf-8");
  console.log(`Saved fresh copy in Downloads: ${localDownloadsPath}`);

  // 5. Push/Overwrite on GitHub
  if (GITHUB_TOKEN && GITHUB_OWNER && GITHUB_REPO) {
    const gitPath = `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/daily_backups/${dateStr}.json`;
    console.log(`Updating daily_backups/${dateStr}.json on GitHub...`);

    let sha = null;
    try {
      const getRes = await makeGithubRequest("GET", gitPath);
      if (getRes.status === 200) {
        sha = JSON.parse(getRes.body).sha;
      }
    } catch (e) {
      console.warn("Could not retrieve SHA, trying create.");
    }

    const contentBase64 = Buffer.from(jsonString).toString("base64");
    const payload = {
      message: `Fresh sync: overwrite with real GHL agents and delete Agent 11 stubs`,
      content: contentBase64
    };
    if (sha) {
      payload.sha = sha;
    }

    const putRes = await makeGithubRequest("PUT", gitPath, payload);
    if (putRes.status === 200 || putRes.status === 201) {
      console.log(`✅ SUCCESS! Overwrote today's report on GitHub with fresh live GHL sync data.`);
    } else {
      console.error(`❌ FAILED to overwrite GitHub report: ${putRes.body}`);
    }
  }
}

runFreshSync().catch((e) => {
  console.error("Fresh sync run failed:", e.message);
});
