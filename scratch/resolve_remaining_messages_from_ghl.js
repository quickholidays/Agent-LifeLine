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
const githubToken = env.GITHUB_TOKEN;
const owner = env.GITHUB_OWNER;
const repo = env.GITHUB_REPO;
const ghlToken = env.GHL_TOKEN;
const locationId = env.GHL_LOCATION_ID;

// Helper to make GHL API requests
function makeGhlRequest(url) {
  return new Promise((resolve, reject) => {
    const options = {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${ghlToken}`,
        "Version": "2021-04-15",
        "Accept": "application/json"
      }
    };
    const req = https.request(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          console.warn(`[GHL API Error] ${url} returned ${res.statusCode}: ${data}`);
          resolve(null);
        }
      });
    });
    req.on("error", (e) => {
      console.error("[GHL API Socket Error]", e.message);
      resolve(null);
    });
    req.end();
  });
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
        "Authorization": `Bearer ${githubToken}`,
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

// Fetch GHL User Map
async function fetchUserMap() {
  console.log("Fetching GHL user map...");
  const url = `https://services.leadconnectorhq.com/users/?locationId=${locationId}`;
  const data = await makeGhlRequest(url);
  const userMap = {};
  if (data && data.users) {
    data.users.forEach(u => {
      userMap[u.id] = u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim();
    });
  }
  return userMap;
}

// Query GHL contact by name to find their assignedTo ID
async function findContactAssignment(contactName) {
  if (!contactName || contactName.toLowerCase() === "ghl contact") return null;
  const url = `https://services.leadconnectorhq.com/contacts/?locationId=${locationId}&query=${encodeURIComponent(contactName)}&limit=1`;
  const data = await makeGhlRequest(url);
  if (data && data.contacts && data.contacts.length > 0) {
    return data.contacts[0].assignedTo || null;
  }
  return null;
}

async function run() {
  if (!ghlToken || !locationId) {
    console.error("Missing GHL credentials in .env.local");
    return;
  }

  const userMap = await fetchUserMap();
  console.log(`Loaded ${Object.keys(userMap).length} users from GHL.`);

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
  const unassignedMsgs = messages.filter(m => !m.agent || m.agent.toLowerCase() === "unassigned");
  console.log(`Total messages: ${messages.length}. Unassigned: ${unassignedMsgs.length}`);
  
  if (unassignedMsgs.length === 0) {
    console.log("No unassigned messages to resolve!");
    return;
  }

  const contactCache = {};
  let resolvedCount = 0;

  for (const m of messages) {
    if (!m.agent || m.agent.toLowerCase() === "unassigned") {
      const name = m.contactName;
      if (!name) continue;

      if (contactCache[name] === undefined) {
        // Fetch assignment from GHL
        console.log(`Searching GHL for contact: "${name}"...`);
        const assignedTo = await findContactAssignment(name);
        if (assignedTo && userMap[assignedTo]) {
          contactCache[name] = userMap[assignedTo];
          console.log(`  -> Found assignment: ${userMap[assignedTo]}`);
        } else {
          contactCache[name] = null;
        }
        // Sleep 150ms to prevent GHL rate limit
        await new Promise(resolve => setTimeout(resolve, 150));
      }

      if (contactCache[name]) {
        m.agent = contactCache[name];
        resolvedCount++;
      }
    }
  }

  // Sync both keys
  report.ghl_outbound_messages = messages;
  report.ghlMessages = messages;

  console.log(`\nSuccessfully resolved ${resolvedCount} additional messages via GHL API search.`);
  
  // 3. Push back to GitHub
  console.log(`Uploading updated report to GitHub...`);
  const putPayload = {
    message: `chore: resolve additional ${resolvedCount} GHL webhook messages via live GHL Contact API lookup`,
    content: Buffer.from(JSON.stringify(report, null, 2)).toString("base64"),
    sha: sha
  };
  
  const putRes = await makeGithubRequest("PUT", gitPath, putPayload);
  if (putRes.status === 200 || putRes.status === 201) {
    console.log(`✅ SUCCESS! Overwrote backup on GitHub with GHL-api resolved agent assignments!`);
  } else {
    console.error(`❌ FAILED to upload updated backup (${putRes.status}): ${putRes.body}`);
  }
}

run().catch(console.error);
