const fs = require("fs");
const path = require("path");
const https = require("https");

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
const owner = env.GITHUB_OWNER;
const repo = env.GITHUB_REPO;

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

// Query contact assignment from GHL API
async function findContactAssignment(contactName) {
  if (!contactName || contactName.toLowerCase() === "ghl contact") return null;
  try {
    const data = await queryGhl("/contacts/", { locationId: GHL_LOCATION_ID, query: contactName, limit: 1 });
    if (data && data.contacts && data.contacts.length > 0) {
      return data.contacts[0].assignedTo || null;
    }
  } catch (e) {
    console.warn(`[GHL API] Search failed for contact: ${contactName}`);
  }
  return null;
}

// Dynamic target date resolution: Today's date in BST/Europe/London timezone
const getTodayBST = () => {
  const d = new Date();
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

const parseToLocalDate = (dateVal) => {
  if (!dateVal) return "";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "";
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

async function runDynamicSync() {
  const targetDateStr = getTodayBST();
  console.log(`=== RUNNING GHL CONVERSATION SYNC & MERGE FOR DATE: ${targetDateStr} ===\n`);

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
  console.log(`Loaded ${Object.keys(userMap).length} GHL users.\n`);

  // 2. Download existing daily report from GitHub
  const gitPath = `/repos/${owner}/${repo}/contents/daily_backups/${targetDateStr}.json`;
  console.log(`Downloading existing report for ${targetDateStr} from GitHub...`);
  const getRes = await makeGithubRequest("GET", gitPath);
  
  let report = {
    agents: {},
    calls: [],
    audit_logs: [],
    ghl_outbound_messages: [],
    ghlMessages: []
  };
  let sha = null;
  let existsOnGithub = false;

  if (getRes.status === 200) {
    const fileData = JSON.parse(getRes.body);
    sha = fileData.sha;
    existsOnGithub = true;
    
    let base64Content = "";
    if (fileData.size <= 1000000) {
      base64Content = fileData.content;
    } else {
      console.log("Report file is > 1MB. Fetching via Blob API...");
      const blobRes = await makeGithubRequest("GET", `/repos/${owner}/${repo}/git/blobs/${sha}`);
      if (blobRes.status === 200) {
        base64Content = JSON.parse(blobRes.body).content;
      }
    }
    
    const cleanBase64 = base64Content.replace(/\s/g, "");
    const decodedContent = Buffer.from(cleanBase64, "base64").toString("utf-8");
    report = JSON.parse(decodedContent);
    console.log(`Loaded existing report from GitHub. Initial messages: ${(report.ghl_outbound_messages || []).length}`);
  } else if (getRes.status === 404) {
    console.log("No daily report found on GitHub yet. Will create a new one with GHL messages.");
  } else {
    console.error(`Failed to fetch report from GitHub (${getRes.status}): ${getRes.body}`);
    return;
  }

  // Build CSV-based contact-to-agent map for fallback mapping
  const contactToAgentMap = {};
  if (report.agents && typeof report.agents === "object" && !Array.isArray(report.agents)) {
    Object.entries(report.agents).forEach(([agentName, stats]) => {
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

  // 3. Fetch Conversations active today from GHL API
  const fetchedMessages = [];
  const contactCache = {};
  let currentStartAfterDate = null;
  let pageCount = 0;
  let hasMore = true;

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

    console.log(`Fetching GHL conversations page ${pageCount}...`);
    const convData = await queryGhl("/conversations/search", params);
    const conversations = convData.conversations || [];
    if (conversations.length === 0) break;

    let foundOlder = false;

    for (const c of conversations) {
      const lastMsgDate = c.lastMessageDate || c.dateUpdated || c.dateCreated;
      if (!lastMsgDate) continue;

      const lastMsgDateStr = parseToLocalDate(lastMsgDate);

      if (lastMsgDateStr === targetDateStr) {
        await sleep(400); // Throttle
        
        // Fetch messages for this thread
        const msgData = await queryGhl(`/conversations/${c.id}/messages`, { limit: 50 });
        const messagesList = (msgData.messages && msgData.messages.messages) || [];

        if (Array.isArray(messagesList)) {
          for (const m of messagesList) {
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

            if (msgDateStr === targetDateStr && isOutbound && !isCall && !isEmail && !isOpportunityLog && !isPlaceholderSms) {
              const msgUserId = m.userId || c.assignedTo;
              let agentName = userMap[msgUserId] || "Unassigned";

              const contactName = c.fullName || "GHL Contact";

              // Tier 2: Lookup via Contact Assignment on GHL
              if ((!agentName || agentName === "Unassigned") && contactName && contactName.toLowerCase() !== "ghl contact") {
                if (contactCache[contactName] === undefined) {
                  const assignedTo = await findContactAssignment(contactName);
                  if (assignedTo && userMap[assignedTo]) {
                    contactCache[contactName] = userMap[assignedTo];
                  } else {
                    contactCache[contactName] = null;
                  }
                  await sleep(150);
                }
                if (contactCache[contactName]) {
                  agentName = contactCache[contactName];
                }
              }

              // Tier 3: Lookup via CSV segmentations
              if ((!agentName || agentName === "Unassigned") && contactName) {
                const cleanName = contactName.trim().toLowerCase();
                if (contactToAgentMap[cleanName]) {
                  agentName = contactToAgentMap[cleanName];
                }
              }

              let cleanBody = m.body;
              if (cleanBody && (cleanBody.includes("<p>") || cleanBody.includes("<br") || cleanBody.includes("</div>") || cleanBody.includes("<html>"))) {
                cleanBody = cleanBody.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
              }

              const isWhatsApp = typeLower.includes("whatsapp");

              fetchedMessages.push({
                id: m.id,
                agent: agentName,
                time: new Date(m.dateAdded).toISOString(),
                body: cleanBody,
                contactName: contactName,
                type: isWhatsApp ? "whatsapp" : "sms"
              });
            }
          }
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

  console.log(`\nFetched ${fetchedMessages.length} GHL outbound messages.`);

  // 4. Merge into existing report without duplicates
  if (!report.ghl_outbound_messages) {
    report.ghl_outbound_messages = report.ghlMessages || [];
  }
  const existingMsgs = report.ghl_outbound_messages;
  const existingIds = new Set(existingMsgs.map(m => m.id));
  
  let newMessagesAdded = 0;
  fetchedMessages.forEach(m => {
    if (!existingIds.has(m.id)) {
      existingMsgs.push(m);
      newMessagesAdded++;
    } else {
      // If already exists but was marked as Unassigned, update the agent name if we resolved it now!
      const existingMsg = existingMsgs.find(ex => ex.id === m.id);
      if (existingMsg && (existingMsg.agent === "Unassigned" || !existingMsg.agent) && m.agent && m.agent !== "Unassigned") {
        existingMsg.agent = m.agent;
      }
    }
  });

  // Sort messages chronologically
  existingMsgs.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  report.ghl_outbound_messages = existingMsgs;
  report.ghlMessages = existingMsgs;
  
  if (!report.summary) {
    report.summary = { total_agents: 0, total_calls: 0, total_actions: 0, total_ghl_messages: 0 };
  }
  report.summary.total_ghl_messages = existingMsgs.length;
  if (report.agents && typeof report.agents === "object" && !Array.isArray(report.agents)) {
    report.summary.total_agents = Object.keys(report.agents).length;
  } else if (Array.isArray(report.agents)) {
    report.summary.total_agents = report.agents.length;
  }

  console.log(`Merged results. Added ${newMessagesAdded} brand new messages. Total daily conversations: ${existingMsgs.length}`);

  // 5. Upload updated daily report to GitHub
  console.log(`Uploading merged daily report back to GitHub...`);
  const putPayload = {
    message: `chore: automatic GHL sync & merge for ${targetDateStr} (added ${newMessagesAdded} new)`,
    content: Buffer.from(JSON.stringify(report, null, 2)).toString("base64")
  };
  if (sha) {
    putPayload.sha = sha;
  }

  const putRes = await makeGithubRequest("PUT", gitPath, putPayload);
  if (putRes.status === 200 || putRes.status === 201) {
    console.log(`✅ SUCCESS! Synced and merged GHL conversations into today's report on GitHub.`);
  } else {
    console.error(`❌ FAILED to upload daily report: ${putRes.body}`);
  }
}

runDynamicSync().catch((e) => console.error("Sync run failed:", e.message));
