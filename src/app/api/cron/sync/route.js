import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Helper to make GHL API requests
async function queryGhl(endpoint, token, params = {}) {
  const url = new URL(`https://services.leadconnectorhq.com${endpoint}`);
  Object.keys(params).forEach((key) => {
    if (params[key] !== undefined && params[key] !== null) {
      url.searchParams.append(key, String(params[key]));
    }
  });

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Version": "2021-04-15",
      "Accept": "application/json",
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`GHL API error (${response.status}): ${errText}`);
  }

  return response.json();
}

// Fetch users to build assignedTo ID -> name map
async function fetchUserMap(token, locationId) {
  try {
    const data = await queryGhl("/users/", token, { locationId });
    const userMap = {};
    if (data.users) {
      data.users.forEach((u) => {
        userMap[u.id] = u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim();
      });
    }
    return userMap;
  } catch (err) {
    console.error("[GHL Cron Sync] Error fetching users:", err.message);
    return {};
  }
}

// Update report data locally
function updateLocalCopy(dateStr, jsonString) {
  try {
    const localDir = path.join(process.cwd(), "Test-Data");
    if (fs.existsSync(localDir)) {
      const localFile = path.join(localDir, `lifeline_report_${dateStr}.json`);
      fs.writeFileSync(localFile, jsonString, "utf-8");
      console.log(`[GHL Cron Sync] Updated local backup file at: ${localFile}`);
      return true;
    }
  } catch (err) {
    console.error("[GHL Cron Sync] Failed to write local backup file:", err.message);
  }
  return false;
}

// Read daily report, replace/merge GHL outbound messages, and write back to GitHub/filesystem
async function updateDailyBackup(dateStr, ghlMessages) {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;

  const fileName = `daily_backups/${dateStr}.json`;
  const githubApiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${fileName}`;

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;
    let reportData = {
      agents: [],
      calls: [],
      audit_logs: [],
      ghl_outbound_messages: []
    };
    let sha = null;
    let existsOnGithub = false;

    // 1. Try to fetch existing data from GitHub
    if (token && owner && repo) {
      try {
        const getResponse = await fetch(githubApiUrl, { headers, cache: "no-store" });
        if (getResponse.ok) {
          const fileData = await getResponse.json();
          sha = fileData.sha;
          existsOnGithub = true;
          const decodedContent = Buffer.from(fileData.content, "base64").toString("utf-8");
          reportData = JSON.parse(decodedContent);
        }
      } catch (err) {
        console.warn(`[GHL Cron Sync] Attempt ${attempt}: Failed to fetch backup from GitHub:`, err.message);
      }
    }

    // 2. If not on GitHub, check local Test-Data directory
    if (!existsOnGithub) {
      try {
        const localDir = path.join(process.cwd(), "Test-Data");
        const localFile = path.join(localDir, `lifeline_report_${dateStr}.json`);
        if (fs.existsSync(localFile)) {
          const fileContent = fs.readFileSync(localFile, "utf-8");
          reportData = JSON.parse(fileContent);
        }
      } catch (err) {
        console.warn("[GHL Cron Sync] Failed to check local backup file:", err.message);
      }
    }

    // 3. Update conversations arrays in the daily report (leaving calls, agents, audit logs untouched)
    reportData.ghl_outbound_messages = ghlMessages;
    reportData.ghlMessages = ghlMessages;

    const jsonString = JSON.stringify(reportData, null, 2);

    // 4. Save back to GitHub
    if (token && owner && repo) {
      const contentBase64 = Buffer.from(jsonString).toString("base64");
      const commitMessage = `Auto-cron: sync GHL messages for ${dateStr}`;
      const putBody = {
        message: commitMessage,
        content: contentBase64,
      };
      if (sha) {
        putBody.sha = sha;
      }

      const putResponse = await fetch(githubApiUrl, {
        method: "PUT",
        headers,
        body: JSON.stringify(putBody),
      });

      if (putResponse.ok) {
        console.log(`[GHL Cron Sync] Successfully updated GitHub backup for ${dateStr}`);
        updateLocalCopy(dateStr, jsonString);
        return { success: true, message: "Updated GitHub and local backup" };
      } else if (putResponse.status === 409 && attempt < maxRetries) {
        console.warn(`[GHL Cron Sync] Attempt ${attempt}: Conflict detected. Retrying in 1s...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      } else {
        const errText = await putResponse.text();
        throw new Error(`GitHub PUT error (${putResponse.status}): ${errText}`);
      }
    } else {
      // Local fallback
      const localUpdated = updateLocalCopy(dateStr, jsonString);
      if (localUpdated) {
        return { success: true, message: "Updated local backup (GitHub config missing)" };
      } else {
        throw new Error("No backup targets available (GitHub env missing and local Test-Data folder does not exist)");
      }
    }
  }

  throw new Error("Failed to update backup after maximum retries due to GitHub conflicts");
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const secretParam = searchParams.get("secret");
    const configuredSecret = process.env.GHL_WEBHOOK_SECRET;

    if (configuredSecret && secretParam !== configuredSecret) {
      return NextResponse.json({ error: "Unauthorized: Invalid secret token" }, { status: 401 });
    }

    const tz = searchParams.get("tz") || "BST";
    const ghlToken = process.env.GHL_TOKEN || process.env.NEXT_PUBLIC_GHL_TOKEN;
    const locationId = process.env.GHL_LOCATION_ID || process.env.NEXT_PUBLIC_GHL_LOCATION_ID;

    if (!ghlToken || !locationId) {
      return NextResponse.json({ error: "Server GHL credentials are incomplete" }, { status: 500 });
    }

    // Resolve date string (YYYY-MM-DD) for today in target timezone
    const tzName = tz === "PKT" ? "Asia/Karachi" : "Europe/London";
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tzName,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    const parts = formatter.formatToParts(new Date());
    const year = parts.find(p => p.type === "year").value;
    const month = parts.find(p => p.type === "month").value;
    const day = parts.find(p => p.type === "day").value;
    const targetDateStr = `${year}-${month}-${day}`;

    console.log(`[GHL Cron Sync] Starting conversations sync for date: ${targetDateStr} (TZ: ${tzName})`);

    // 1. Fetch Users
    const userMap = await fetchUserMap(ghlToken, locationId);

    // 2. Fetch Conversations from GHL active today
    const outboundMessages = [];
    let currentStartAfterDate = null;
    let hasMore = true;
    let pageCount = 0;

    const parseToLocalDate = (dateVal) => {
      if (!dateVal) return "";
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return "";
      const parts = formatter.formatToParts(d);
      const y = parts.find(p => p.type === "year").value;
      const m = parts.find(p => p.type === "month").value;
      const day = parts.find(p => p.type === "day").value;
      return `${y}-${m}-${day}`;
    };

    while (hasMore && pageCount < 10) {
      pageCount++;
      const params = {
        locationId,
        limit: 25,
        status: "all",
        sortBy: "last_message_date",
        sort: "desc"
      };
      if (currentStartAfterDate) {
        params.startAfterDate = currentStartAfterDate;
      }

      console.log(`[GHL Cron Sync] Fetching conversations search page ${pageCount}...`);
      const convData = await queryGhl("/conversations/search", ghlToken, params);
      const conversations = convData.conversations || [];
      if (conversations.length === 0) {
        break;
      }

      let foundOlder = false;

      for (const c of conversations) {
        const lastMsgDate = c.lastMessageDate || c.dateUpdated || c.dateCreated;
        if (!lastMsgDate) continue;

        const lastMsgDateStr = parseToLocalDate(lastMsgDate);

        if (lastMsgDateStr === targetDateStr) {
          const assignedUserId = c.assignedTo;
          const mappedAgentName = userMap[assignedUserId] || "Unassigned";

          // Fetch messages for this conversation thread
          const msgData = await queryGhl(`/conversations/${c.id}/messages`, ghlToken, { limit: 50 });
          const messages = (msgData.messages && msgData.messages.messages) || [];

          if (Array.isArray(messages)) {
            messages.forEach((m) => {
              const msgDateStr = parseToLocalDate(m.dateAdded);
              
              // Only pull OUTBOUND SMS messages (exclude calls and emails, as per "sms only" configuration)
              const typeLower = String(m.type || m.messageType || "").toLowerCase();
              const isCall = typeLower.includes("call") || typeLower.includes("phone");
              const isEmail = typeLower.includes("email");
              const isOutbound = m.direction === "outbound";

              if (msgDateStr === targetDateStr && isOutbound && !isCall && !isEmail) {
                let cleanBody = m.body || "[SMS Message]";
                if (cleanBody && (cleanBody.includes("<p>") || cleanBody.includes("<br") || cleanBody.includes("</div>") || cleanBody.includes("<html>"))) {
                  cleanBody = cleanBody.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
                }

                outboundMessages.push({
                  id: m.id,
                  agent: mappedAgentName,
                  time: new Date(m.dateAdded).toISOString(),
                  body: cleanBody,
                  contactName: c.fullName || "GHL Contact",
                  type: "sms"
                });
              }
            });
          }
        } else if (new Date(lastMsgDate) < new Date(new Date().setHours(0,0,0,0) - 24 * 60 * 60 * 1000 * 2)) {
          // If conversation date is older than 2 days ago, stop paging
          foundOlder = true;
        }
      }

      if (foundOlder) {
        console.log(`[GHL Cron Sync] Found older conversations. Stopping pagination.`);
        break;
      }

      const lastItem = conversations[conversations.length - 1];
      currentStartAfterDate = lastItem.lastMessageDate || lastItem.dateUpdated || lastItem.dateCreated;
    }

    console.log(`[GHL Cron Sync] Sync complete. Found ${outboundMessages.length} GHL outbound SMS messages for date ${targetDateStr}.`);

    // 3. Update backup report with the compiled conversations
    const result = await updateDailyBackup(targetDateStr, outboundMessages);

    return NextResponse.json({
      success: true,
      message: "Sync completed successfully",
      date: targetDateStr,
      details: result.message,
      syncedCount: outboundMessages.length,
      syncedRecords: outboundMessages
    });
  } catch (error) {
    console.error("[GHL Cron Sync] Route Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
