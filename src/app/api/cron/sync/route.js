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

// Read daily report, replace/merge GHL outbound messages, and write back to GitHub
async function updateDailyBackup(dateStr, ghlMessages) {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;

  if (!token || !owner || !repo) {
    throw new Error("No backup targets available (GitHub env missing)");
  }

  const fileName = `daily_backups/messages_${dateStr}.json`;
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
      ghl_outbound_messages: [],
      ghlMessages: [],
      summary: { total_ghl_messages: 0 }
    };
    let sha = null;

    // 1. Try to fetch existing data from GitHub
    try {
      const getResponse = await fetch(githubApiUrl, { headers, cache: "no-store" });
      if (getResponse.ok) {
        const fileData = await getResponse.json();
        sha = fileData.sha;
        
        let base64Content = fileData.content;
        if (!base64Content) {
          const blobUrl = `https://api.github.com/repos/${owner}/${repo}/git/blobs/${fileData.sha}`;
          const blobResponse = await fetch(blobUrl, { headers, cache: "no-store" });
          if (blobResponse.ok) {
            const blobData = await blobResponse.json();
            base64Content = blobData.content;
          }
        }
        
        if (base64Content) {
          const cleanBase64 = base64Content.replace(/\s/g, "");
          const decodedContent = Buffer.from(cleanBase64, "base64").toString("utf-8");
          reportData = JSON.parse(decodedContent);
        }
      }
    } catch (err) {
      console.warn(`[GHL Cron Sync] Attempt ${attempt}: Failed to fetch backup from GitHub:`, err.message);
    }

    const existingMsgs = reportData.ghl_outbound_messages || reportData.ghlMessages || [];
    const existingIds = new Set(existingMsgs.map(m => m.id));
    const mergedMessages = [...existingMsgs];
    
    ghlMessages.forEach(msg => {
      if (!existingIds.has(msg.id)) {
        mergedMessages.push(msg);
      }
    });

    mergedMessages.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    reportData.ghl_outbound_messages = mergedMessages;
    reportData.ghlMessages = mergedMessages;
    if (!reportData.summary) {
      reportData.summary = { total_ghl_messages: 0 };
    }
    reportData.summary.total_ghl_messages = mergedMessages.length;

    const jsonString = JSON.stringify(reportData, null, 2);

    // 2. Save back to GitHub
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
      console.log(`[GHL Cron Sync] Successfully updated GitHub messages backup for ${dateStr}`);
      return { success: true, message: "Updated GitHub messages backup" };
    } else if (putResponse.status === 409 && attempt < maxRetries) {
      console.warn(`[GHL Cron Sync] Attempt ${attempt}: Conflict detected. Retrying in 1s...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      continue;
    } else {
      const errText = await putResponse.text();
      throw new Error(`GitHub PUT error (${putResponse.status}): ${errText}`);
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

    const activeConversations = [];
    while (hasMore && pageCount < 50) {
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
          activeConversations.push(c);
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

    console.log(`[GHL Cron Sync] Found ${activeConversations.length} active conversations for today. Processing in batches of 5...`);

    const batchSize = 10;
    for (let i = 0; i < activeConversations.length; i += batchSize) {
      const batch = activeConversations.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (c) => {
        try {
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

              const bodyTrimmed = String(m.body || "").trim();
              const bodyLower = bodyTrimmed.toLowerCase();
              const isOpportunityLog = bodyLower.includes("opportunity updated") || 
                                       bodyLower.includes("opportunity created") || 
                                       bodyLower.includes("opportunity stage updated");
              const isPlaceholderSms = bodyLower === "[sms message]" || bodyLower === "" || bodyTrimmed.length === 0;

              if (msgDateStr === targetDateStr && isOutbound && !isCall && !isEmail && !isOpportunityLog && !isPlaceholderSms) {
                let cleanBody = m.body || "[SMS Message]";
                if (cleanBody && (cleanBody.includes("<p>") || cleanBody.includes("<br") || cleanBody.includes("</div>") || cleanBody.includes("<html>"))) {
                  cleanBody = cleanBody.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
                }

                const msgUserId = m.userId || c.assignedTo;
                const msgAgentName = userMap[msgUserId] || "Unassigned";
                const cId = c.contactId || c.contact_id || c.id || "";
                const baseName = c.fullName || "GHL Contact";
                const cNameWithId = cId ? `${baseName} (${cId})` : baseName;

                outboundMessages.push({
                  id: m.id,
                  agent: msgAgentName,
                  time: new Date(m.dateAdded).toISOString(),
                  body: cleanBody,
                  contactName: cNameWithId,
                  contactId: cId,
                  type: typeLower.includes("whatsapp") ? "whatsapp" : "sms"
                });
              }
            });
          }
        } catch (err) {
          console.error(`[GHL Cron Sync] Failed to fetch messages for conv ${c.id}:`, err.message);
        }
      }));

      // Sleep 600ms between batches to stay within GHL burst rate limits (approx 15 req/sec burst)
      if (i + batchSize < activeConversations.length) {
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
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
