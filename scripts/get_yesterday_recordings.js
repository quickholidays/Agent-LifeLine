/**
 * GHL Call Recordings Extractor - Yesterday (or Custom Date)
 * 
 * Usage:
 *   node scripts/get_yesterday_recordings.js
 *   node scripts/get_yesterday_recordings.js --date=2026-09-22 --tz=BST
 *   node scripts/get_yesterday_recordings.js --agent="Annie Adams"
 */

const fs = require("fs");
const path = require("path");

// 1. Load environment variables from .env.local
function loadEnv() {
  const envPath = path.resolve(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("❌ Error: .env.local file not found at", envPath);
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, "utf8");
  const env = {};
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx !== -1) {
      let val = line.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[line.slice(0, idx).trim()] = val;
    }
  }
  return env;
}

const env = loadEnv();
const GHL_TOKEN = env.GHL_TOKEN || env.NEXT_PUBLIC_GHL_TOKEN;
const GHL_LOCATION_ID = env.GHL_LOCATION_ID || env.NEXT_PUBLIC_GHL_LOCATION_ID;

if (!GHL_TOKEN || !GHL_LOCATION_ID) {
  console.error("❌ Error: Missing GHL_TOKEN or GHL_LOCATION_ID in .env.local");
  process.exit(1);
}

// Parse CLI flags
const args = process.argv.slice(2);
let customDate = null;
let targetTz = "BST";
let agentFilter = null;
let downloadFiles = true;

args.forEach((arg) => {
  if (arg.startsWith("--date=")) customDate = arg.split("=")[1].trim();
  if (arg.startsWith("--tz=")) targetTz = arg.split("=")[1].trim().toUpperCase();
  if (arg.startsWith("--agent=")) agentFilter = arg.split("=")[1].trim();
  if (arg === "--no-download") downloadFiles = false;
});

const tzName = targetTz === "PKT" ? "Asia/Karachi" : "Europe/London";

// Utility: Sleep / Delay
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Format date to filename safe string: YYYY-MM-DD_HH-mm-ss
function formatTimestampForFilename(dateInput) {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "unknown_date";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

// Sanitize phone number for safe filenames
function sanitizePhoneNumber(phone) {
  if (!phone) return "unknown_number";
  const clean = String(phone).replace(/[^\w\d+-]/g, "").trim();
  return clean || "unknown_number";
}

// Format duration
function formatDuration(sec) {
  if (!sec || isNaN(sec)) return "00:00";
  const s = parseInt(sec, 10);
  const min = Math.floor(s / 60);
  const secLeft = s % 60;
  return `${String(min).padStart(2, "0")}:${String(secLeft).padStart(2, "0")}`;
}

// Helper: Query GHL API with automatic rate-limit retry
async function queryGhl(endpoint, params = {}) {
  const url = new URL(`https://services.leadconnectorhq.com${endpoint}`);
  Object.keys(params).forEach((k) => {
    if (params[k] !== undefined && params[k] !== null) {
      url.searchParams.append(k, String(params[k]));
    }
  });

  let attempts = 0;
  while (attempts < 5) {
    attempts++;
    try {
      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${GHL_TOKEN}`,
          Version: "2021-04-15",
          Accept: "application/json",
        },
      });

      if (res.status === 429) {
        console.warn("  ⚠️ [GHL 429 Rate Limit] Cooling down for 3 seconds...");
        await sleep(3000);
        continue;
      }

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`GHL API Error ${res.status}: ${errText}`);
      }

      return await res.json();
    } catch (e) {
      if (attempts >= 5) throw e;
      await sleep(1500);
    }
  }
}

// Helper: Fetch binary audio recording for a specific message
async function fetchCallRecordingBinary(messageId, locationId) {
  const url = `https://services.leadconnectorhq.com/conversations/messages/${messageId}/locations/${locationId}/recording`;
  let attempts = 0;
  while (attempts < 3) {
    attempts++;
    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${GHL_TOKEN}`,
          Version: "2021-04-15",
        },
      });

      if (res.status === 404) return null;
      if (res.status === 429) {
        await sleep(3000);
        continue;
      }
      if (!res.ok) return null;

      const contentType = res.headers.get("content-type") || "";
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (buffer.length === 0) return null;

      let ext = "wav";
      if (contentType.includes("mpeg") || contentType.includes("mp3")) {
        ext = "mp3";
      } else if (buffer.slice(0, 4).toString() === "RIFF") {
        ext = "wav";
      }

      return { buffer, ext, contentType };
    } catch (e) {
      if (attempts >= 3) return null;
      await sleep(1000);
    }
  }
  return null;
}

async function run() {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tzName,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parseToLocalDate = (dateVal) => {
    if (!dateVal) return "";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "";
    const parts = formatter.formatToParts(d);
    const y = parts.find((p) => p.type === "year").value;
    const m = parts.find((p) => p.type === "month").value;
    const day = parts.find((p) => p.type === "day").value;
    return `${y}-${m}-${day}`;
  };

  let targetDateStr = customDate;
  if (!targetDateStr) {
    const now = new Date();
    const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    targetDateStr = parseToLocalDate(yesterdayDate);
  }

  console.log("==========================================================");
  console.log("🎙️  GHL CALL RECORDINGS EXTRACTOR — YESTERDAY");
  console.log(`📅  Target Date  : ${targetDateStr} (${tzName})`);
  console.log(`🏢  Location ID  : ${GHL_LOCATION_ID}`);
  if (agentFilter) console.log(`👤  Agent Filter : ${agentFilter}`);
  console.log("==========================================================\n");

  // 1. Fetch Users
  console.log("👥 Fetching GHL User Map...");
  const ud = await queryGhl("/users/", { locationId: GHL_LOCATION_ID });
  const userMap = {};
  (ud.users || []).forEach((u) => {
    userMap[u.id] = u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim();
  });
  console.log(`   Loaded ${Object.keys(userMap).length} GHL users.\n`);

  // Load agents map JSON if available
  let localAgentsMap = [];
  try {
    const mapPath = path.resolve(__dirname, "..", "src", "utils", "agents_map.json");
    if (fs.existsSync(mapPath)) {
      localAgentsMap = JSON.parse(fs.readFileSync(mapPath, "utf-8"));
    }
  } catch (e) {}

  // 2. Fetch Active Conversations
  console.log("🔍 Scanning GHL Conversations active on target date...");
  let currentStartAfterDate = null;
  let page = 0;
  const activeConversations = [];

  while (page < 40) {
    page++;
    process.stdout.write(`\r   Scanning search page ${page}... `);
    const params = {
      locationId: GHL_LOCATION_ID,
      limit: 25,
      status: "all",
      sortBy: "last_message_date",
      sort: "desc",
    };
    if (currentStartAfterDate) params.startAfterDate = currentStartAfterDate;

    const convData = await queryGhl("/conversations/search", params);
    const convs = convData.conversations || [];
    if (convs.length === 0) break;

    let foundOlder = false;
    for (const c of convs) {
      const lmd = c.lastMessageDate || c.dateUpdated || c.dateCreated;
      if (!lmd) continue;
      const dateStr = parseToLocalDate(lmd);

      if (dateStr === targetDateStr || new Date(lmd) >= new Date(new Date(targetDateStr).getTime())) {
        activeConversations.push(c);
      } else if (new Date(lmd) < new Date(new Date(targetDateStr).getTime() - 24 * 60 * 60 * 1000 * 2)) {
        foundOlder = true;
      }
    }

    if (foundOlder) break;
    const lastItem = convs[convs.length - 1];
    currentStartAfterDate = lastItem.lastMessageDate || lastItem.dateUpdated || lastItem.dateCreated;
  }

  console.log(`\n   Found ${activeConversations.length} conversation threads to inspect.\n`);

  // 3. Scan messages for call events
  const baseOutputDir = path.resolve(__dirname, "..", "Test-Data", "recordings_yesterday");
  if (downloadFiles && !fs.existsSync(baseOutputDir)) {
    fs.mkdirSync(baseOutputDir, { recursive: true });
  }

  const callRecords = [];
  let callsFound = 0;
  let downloadedCount = 0;

  for (let i = 0; i < activeConversations.length; i++) {
    const c = activeConversations[i];
    process.stdout.write(`\r[${i + 1}/${activeConversations.length}] Checking thread: "${c.fullName || c.contactName || "Contact"}"... `);

    try {
      const msgData = await queryGhl(`/conversations/${c.id}/messages`, { limit: 50 });
      const msgs = (msgData.messages && msgData.messages.messages) || (Array.isArray(msgData.messages) ? msgData.messages : []);

      for (const m of msgs) {
        const msgDateStr = parseToLocalDate(m.dateAdded);
        if (msgDateStr !== targetDateStr) continue;

        const typeLower = String(m.type || m.messageType || "").toLowerCase();
        const isCall =
          typeLower.includes("call") ||
          typeLower.includes("phone") ||
          m.messageType === "TYPE_CALL" ||
          m.messageType === "TYPE_CAMPAIGN_CALL" ||
          m.type === 1 ||
          m.type === 8 ||
          !!m.call ||
          !!m.meta?.call;

        if (!isCall) continue;

        callsFound++;
        const msgUserId = m.userId || c.assignedTo;
        let agentName = userMap[msgUserId] || "Unassigned";

        if (agentName === "Unassigned" && msgUserId && localAgentsMap.length > 0) {
          const match = localAgentsMap.find((a) => a.id === msgUserId || a.ghl_user_id === msgUserId);
          if (match) agentName = match.name;
        }

        if (agentFilter && !agentName.toLowerCase().includes(agentFilter.toLowerCase())) {
          continue;
        }

        const durationSec = parseInt(m.meta?.call?.duration || m.call?.duration || m.duration || 0, 10);
        const rawStatus = m.meta?.call?.status || m.call?.status || m.status || "completed";
        const contactName = c.fullName || c.contactName || "Unknown Contact";
        const contactPhone = c.phone || m.to || m.from || "N/A";
        const direction = m.direction || m.call?.direction || "outbound";

        const recInfo = {
          messageId: m.id,
          conversationId: c.id,
          contactId: c.contactId || m.contactId || "",
          contactName,
          contactPhone,
          agentName,
          direction,
          status: rawStatus,
          durationSeconds: durationSec,
          durationFormatted: formatDuration(durationSec),
          dateAdded: m.dateAdded,
          from: m.from || m.call?.from || "N/A",
          to: m.to || m.call?.to || contactPhone,
          audioUrl: `/api/recordings/audio?messageId=${m.id}`,
        };

        if (downloadFiles) {
          const agentFolder = path.join(baseOutputDir, agentName.replace(/[^\w\d\s-]/g, "").trim() || "Unassigned");
          if (!fs.existsSync(agentFolder)) fs.mkdirSync(agentFolder, { recursive: true });

          const timeStr = formatTimestampForFilename(m.dateAdded);
          const cleanPhone = sanitizePhoneNumber(contactPhone);
          const recording = await fetchCallRecordingBinary(m.id, GHL_LOCATION_ID);

          if (recording) {
            const fileName = `${timeStr}_${cleanPhone}.${recording.ext}`;
            const filePath = path.join(agentFolder, fileName);
            fs.writeFileSync(filePath, recording.buffer);
            downloadedCount++;
            recInfo.localFile = path.relative(path.resolve(__dirname, ".."), filePath);
            console.log(`\n   📥 [${agentName}] Downloaded: ${fileName} (${(recording.buffer.length / 1024).toFixed(1)} KB)`);
          }
        }

        callRecords.push(recInfo);
      }
    } catch (err) {
      // ignore
    }
    await sleep(150);
  }

  // Save JSON Manifest
  const manifestPath = path.join(baseOutputDir, "yesterday_recordings_manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(callRecords, null, 2));

  console.log("\n\n==========================================================");
  console.log("🎉 RECORDINGS EXTRACTION COMPLETED");
  console.log(`📅 Target Date               : ${targetDateStr}`);
  console.log(`📞 Total Call Events Found   : ${callsFound}`);
  console.log(`📄 Matching Target Records   : ${callRecords.length}`);
  if (downloadFiles) {
    console.log(`📥 Audio Files Downloaded    : ${downloadedCount}`);
    console.log(`📁 Saved Directory           : ${baseOutputDir}`);
  }
  console.log(`📋 JSON Manifest Saved To    : ${manifestPath}`);
  console.log("==========================================================\n");
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
