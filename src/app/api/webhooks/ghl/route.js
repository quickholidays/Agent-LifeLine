import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Helper to fetch contact info from GHL API
async function fetchContactFromGhl(contactId, token) {
  if (!contactId || !token) return null;
  try {
    const response = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Version": "2021-04-15",
        "Accept": "application/json"
      }
    });
    if (response.ok) {
      const data = await response.json();
      return data.contact;
    }
  } catch (err) {
    console.error("[GHL Webhook] Error fetching contact from GHL:", err.message);
  }
  return null;
}

// Helper to fetch user map from GHL API
async function fetchUserMap(token, locationId) {
  if (!token || !locationId) return {};
  try {
    const response = await fetch(`https://services.leadconnectorhq.com/users/?locationId=${locationId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Version": "2021-04-15",
        "Accept": "application/json"
      }
    });
    if (response.ok) {
      const data = await response.json();
      const userMap = {};
      if (data.users) {
        data.users.forEach(u => {
          userMap[u.id] = u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim();
        });
      }
      return userMap;
    }
  } catch (err) {
    console.error("[GHL Webhook] Error fetching users from GHL:", err.message);
  }
  return {};
}

// Parse various webhook payload shapes
async function parseGhlWebhook(payload, ghlToken, locationId, tz = "BST") {
  // 1. Resolve Contact ID
  const contactId = payload.contactId || payload.contact_id || (payload.contact && payload.contact.id) || "";

  // 2. Resolve User/Agent ID
  const userId = payload.userId || payload.user_id || payload.assignedTo || payload.assigned_to || (payload.user && payload.user.id) || "";

  // 3. Extract contact details if present
  let contactName = payload.contactName || payload.contact_name || payload.fullName || payload.full_name || (payload.contact && payload.contact.name) || "";
  let email = payload.email || payload.contact_email || (payload.contact && payload.contact.email) || "";
  let phone = payload.phone || payload.contact_phone || (payload.contact && payload.contact.phone) || "";

  // If details are missing but contactId is present, fetch them from GHL
  if ((!contactName || !email) && contactId && ghlToken) {
    console.log(`[GHL Webhook] Fetching missing contact details for ID: ${contactId}`);
    const contact = await fetchContactFromGhl(contactId, ghlToken);
    if (contact) {
      const firstName = contact.firstName || "";
      const lastName = contact.lastName || "";
      contactName = contactName || `${firstName} ${lastName}`.trim() || contact.email || "GHL Contact";
      email = email || contact.email || "";
      phone = phone || contact.phone || "";
    }
  }

  // Fallback for contactName if still empty
  if (!contactName) {
    const firstName = payload.firstName || payload.first_name || (payload.contact && payload.contact.firstName) || "";
    const lastName = payload.lastName || payload.last_name || (payload.contact && payload.contact.lastName) || "";
    contactName = `${firstName} ${lastName}`.trim();
  }
  if (!contactName && email) {
    contactName = email;
  }
  if (!contactName) {
    contactName = "GHL Contact";
  }

  // 4. Resolve Agent/User Name
  let agentName = payload.agentName || payload.agent_name || payload.userName || payload.user_name || (payload.user && payload.user.name) || "";
  if (!agentName && userId && ghlToken && locationId) {
    console.log(`[GHL Webhook] Mapping agent ID: ${userId} to name...`);
    const userMap = await fetchUserMap(ghlToken, locationId);
    agentName = userMap[userId] || "Unassigned";
  }
  
  // Fallback: If agentName is still empty or Unassigned, resolve it via contact's assignment in GHL!
  if ((!agentName || agentName === "Unassigned") && contactId && ghlToken && locationId) {
    try {
      console.log(`[GHL Webhook] Resolving agent assignment from GHL contact ID: ${contactId}...`);
      const contact = await fetchContactFromGhl(contactId, ghlToken);
      if (contact && contact.assignedTo) {
        const userMap = await fetchUserMap(ghlToken, locationId);
        const mapped = userMap[contact.assignedTo];
        if (mapped) {
          agentName = mapped;
          console.log(`[GHL Webhook] Successfully resolved agent name from GHL contact assignment: ${agentName}`);
        }
      }
    } catch (e) {
      console.error("[GHL Webhook] Error resolving agent assignment:", e.message);
    }
  }

  if (!agentName) {
    agentName = "Unassigned";
  }

  // 5. Extract Message/Email Body
  let body = payload.body || payload.message_body || payload.text || payload.content || payload.email_body || payload.html || "";
  if (payload.email && typeof payload.email === "object") {
    body = body || payload.email.body || payload.email.html || "";
  }
  if (payload.message && typeof payload.message === "object") {
    body = body || payload.message.body || payload.message.text || "";
  }

  // Strip HTML tags if body contains html tags
  if (body && (body.includes("<p>") || body.includes("<br") || body.includes("</div>") || body.includes("<html>"))) {
    body = body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }

  // 6. Extract Direction
  const direction = payload.direction || "outbound";

  // 7. Extract Subject
  let subject = payload.subject || payload.email_subject || (payload.email && payload.email.subject) || "";

  // 8. Extract Date / Timestamp
  let timestamp = payload.date || payload.timestamp || payload.created_at || new Date().toISOString();
  let timeObj = new Date(timestamp);
  if (isNaN(timeObj.getTime())) {
    timeObj = new Date();
  }

  // Resolve target timezone date formatting (BST or PKT)
  const tzName = tz === "PKT" ? "Asia/Karachi" : "Europe/London";
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tzName,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = formatter.formatToParts(timeObj);
  const year = parts.find(p => p.type === "year").value;
  const month = parts.find(p => p.type === "month").value;
  const day = parts.find(p => p.type === "day").value;
  const dateStr = `${year}-${month}-${day}`;

  const finalContactName = contactId ? `${contactName} (${contactId})` : contactName;

  return {
    contactId,
    contactName: finalContactName,
    email,
    phone,
    agentName,
    body,
    subject,
    direction,
    timeObj,
    dateStr
  };
}

// Write/update report data locally
function updateLocalCopy(dateStr, jsonString) {
  try {
    const localDir = path.join(process.cwd(), "Test-Data");
    if (fs.existsSync(localDir)) {
      const localFile = path.join(localDir, `lifeline_report_${dateStr}.json`);
      fs.writeFileSync(localFile, jsonString, "utf-8");
      console.log(`[GHL Webhook] Updated local backup file at: ${localFile}`);
      return true;
    }
  } catch (err) {
    console.error("[GHL Webhook] Failed to write local backup file:", err.message);
  }
  return false;
}

// Read and update the daily backup JSON file on GitHub / filesystem
async function updateDailyBackup(dateStr, newMessage) {
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
          
          let base64Content = "";
          if (fileData.size <= 1000000) {
            base64Content = fileData.content;
          } else {
            console.log(`[GHL Webhook] Report size is ${fileData.size} (> 1MB). Fetching via Git Blob API...`);
            const blobUrl = `https://api.github.com/repos/${owner}/${repo}/git/blobs/${fileData.sha}`;
            const blobResponse = await fetch(blobUrl, { headers, cache: "no-store" });
            if (blobResponse.ok) {
              const blobData = await blobResponse.json();
              base64Content = blobData.content;
            } else {
              throw new Error(`Git Blob API returned status ${blobResponse.status}`);
            }
          }
          
          const cleanBase64 = (base64Content || "").replace(/\s/g, "");
          const decodedContent = Buffer.from(cleanBase64, "base64").toString("utf-8");
          reportData = JSON.parse(decodedContent);
        }
      } catch (err) {
        console.warn(`[GHL Webhook] Attempt ${attempt}: Failed to fetch backup from GitHub:`, err.message);
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
        console.warn("[GHL Webhook] Failed to check local backup file:", err.message);
      }
    }

    // Ensure array keys exist
    if (!reportData.ghl_outbound_messages) {
      reportData.ghl_outbound_messages = reportData.ghlMessages || [];
    }

    // 3. Deduplication Check: Skip if message was already added
    const isDuplicate = reportData.ghl_outbound_messages.some(msg => 
      msg.id === newMessage.id || 
      (msg.body === newMessage.body && 
       msg.contactName === newMessage.contactName && 
       Math.abs(new Date(msg.time).getTime() - new Date(newMessage.time).getTime()) < 5000)
    );

    if (isDuplicate) {
      console.log("[GHL Webhook] Duplicate message detected. Ignoring.");
      return { success: true, message: "Duplicate message ignored" };
    }

    // 4. Append the message
    reportData.ghl_outbound_messages.push(newMessage);
    reportData.ghlMessages = reportData.ghl_outbound_messages; // Sync both keys

    const jsonString = JSON.stringify(reportData, null, 2);

    // 5. Save back to GitHub
    if (token && owner && repo) {
      const contentBase64 = Buffer.from(jsonString).toString("base64");
      const commitMessage = `Auto-webhook: add email for ${dateStr} - agent ${newMessage.agent}`;
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
        console.log(`[GHL Webhook] Successfully updated GitHub backup for ${dateStr}`);
        updateLocalCopy(dateStr, jsonString);
        return { success: true, message: "Updated GitHub and local backup" };
      } else if (putResponse.status === 409 && attempt < maxRetries) {
        console.warn(`[GHL Webhook] Attempt ${attempt}: Conflict detected. Retrying in 1s...`);
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

export async function POST(req) {
  try {
    // 1. Webhook Secret Validation (Optional check)
    const { searchParams } = new URL(req.url);
    const secretParam = searchParams.get("secret");
    const configuredSecret = process.env.GHL_WEBHOOK_SECRET;

    if (configuredSecret && secretParam !== configuredSecret) {
      return NextResponse.json({ error: "Unauthorized: Invalid webhook secret token" }, { status: 401 });
    }

    const tz = searchParams.get("tz") || "BST";
    const payload = await req.json();

    console.log("[GHL Webhook] Received payload:", JSON.stringify(payload, null, 2));

    const typeLower = String(payload.type || payload.messageType || "").toLowerCase();
    const isEmail = typeLower === "email" || typeLower === "type_email";

    if (isEmail) {
      console.log("[GHL Webhook] Webhook ignored: email messages are disabled (SMS only).");
      return NextResponse.json({
        success: true,
        message: "Webhook ignored: email messages are disabled"
      });
    }

    const ghlToken = process.env.GHL_TOKEN || process.env.NEXT_PUBLIC_GHL_TOKEN;
    const locationId = process.env.GHL_LOCATION_ID || process.env.NEXT_PUBLIC_GHL_LOCATION_ID;

    // 2. Parse payload details
    const parsedData = await parseGhlWebhook(payload, ghlToken, locationId, tz);

    // 3. Ignore empty/placeholder message bodies (Opportunity changes)
    const bodyText = String(parsedData.body || "").trim().toLowerCase();
    if (bodyText === "" || bodyText === "[sms message]") {
      console.log("[GHL Webhook] Ignoring opportunity status message or empty body SMS:", parsedData.body);
      return NextResponse.json({
        success: true,
        message: "Webhook ignored: opportunity status change or empty body placeholder"
      });
    }

    // Ignore inbound messages (sent by client, not agent)
    const direction = String(parsedData.direction || "outbound").trim().toLowerCase();
    if (direction === "inbound" || direction === "incoming") {
      console.log("[GHL Webhook] Ignoring inbound message from client:", parsedData.body);
      return NextResponse.json({
        success: true,
        message: "Webhook ignored: inbound message"
      });
    }

    console.log("[GHL Webhook] Real-time live sync is disabled. GHL messages will be synced in bulk at 8:00 PM PKT.");
    return NextResponse.json({
      success: true,
      message: "Webhook ignored: Live sync is disabled for GHL messages (synced in bulk at 8:00 PM PKT)"
    });
  } catch (error) {
    console.error("[GHL Webhook] Route Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
