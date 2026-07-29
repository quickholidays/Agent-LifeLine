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
    console.error("[WhatsApp Webhook] Error fetching contact from GHL:", err.message);
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
    console.error("[WhatsApp Webhook] Error fetching users from GHL:", err.message);
  }
  return {};
}

// Helper to normalize agent names casing/spacing for robust comparison
function normalizeAgentName(name) {
  if (!name) return "";
  const clean = name.replace(/\s+/g, " ").trim().toLowerCase();
  if (clean === "unassigned" || clean === "unassigned user") return "";
  if (clean === "emily jone" || clean === "emily jones") return "Emily Jones";
  if (clean === "jessica jessie" || clean === "jessica jessy") return "Jessica Jessie";
  if (clean === "daniel evan" || clean === "daniel evans") return "Daniel Evans";
  if (clean === "bella evan" || clean === "bella evans") return "Bella Evans";
  if (clean === "annie adams" || clean === "annie adam") return "Annie Adams";
  if (clean === "anaya morgan") return "Anaya Morgan";
  if (clean === "amber williams") return "Amber Williams";
  if (clean === "chris morgan") return "Chris Morgan";
  if (clean === "lisa evan" || clean === "lisa evans") return "Lisa Evans";
  if (clean === "jennie miller") return "Jennie Miller";
  return name.replace(/\s+/g, " ").trim().split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export async function POST(req) {
  try {
    const payload = await req.json();
    console.log("[WhatsApp Webhook] Received payload:", payload);

    const ghlToken = process.env.GHL_TOKEN || process.env.NEXT_PUBLIC_GHL_TOKEN;
    const locationId = process.env.GHL_LOCATION_ID || process.env.NEXT_PUBLIC_GHL_LOCATION_ID;

    // Support both flat payloads and payloads nested inside a "row" key from n8n
    const data = payload.row || payload || {};

    // Ignore inbound messages from clients (we only track agent outbound actions)
    const direction = String(data.direction || payload.direction || data.message_direction || data.messageDirection || "outbound").trim().toLowerCase();
    if (direction === "inbound" || direction === "incoming") {
      console.log("[WhatsApp Webhook] Ignoring inbound message from client.");
      return NextResponse.json({ success: true, message: "Inbound message ignored" });
    }

    // 1. Resolve Agent Name from agent_id or raw agent string
    let rawAgent = data.agent || data.agentName || "";
    let agentId = data.agent_id || data.agentId || data.sent_by_agent_id || "";
    const contactId = data.contact_id || data.contactId || "";
    let contact = null;

    // Load local agents map JSON to resolve Supabase UUIDs or GHL IDs
    let agentsMap = [];
    try {
      const mapPath = path.join(process.cwd(), "src", "utils", "agents_map.json");
      if (fs.existsSync(mapPath)) {
        agentsMap = JSON.parse(fs.readFileSync(mapPath, "utf-8"));
      }
    } catch (err) {
      console.error("[WhatsApp Webhook] Failed to load agents_map.json:", err.message);
    }

    // Try to resolve rawAgent via our mapping file first
    if (agentId && agentsMap.length > 0) {
      const match = agentsMap.find(a => a.id === agentId || a.ghl_user_id === agentId);
      if (match) {
        rawAgent = match.name;
        console.log(`[WhatsApp Webhook] Resolved agent name via mapping file: ${rawAgent}`);
      }
    }

    // Fallback: If no agent name/ID is provided, fetch GHL contact's assigned user ID
    if ((!rawAgent || rawAgent === "Unassigned") && (!agentId || agentId === "Unassigned") && contactId && ghlToken) {
      console.log(`[WhatsApp Webhook] No agent ID passed. Querying contact ${contactId} from GHL for assignment...`);
      contact = await fetchContactFromGhl(contactId, ghlToken);
      if (contact && contact.assignedTo) {
        const assignedGhlId = contact.assignedTo;
        console.log(`[WhatsApp Webhook] Resolved contact owner agent ID: ${assignedGhlId}`);
        // Search assignedGhlId in agentsMap
        const match = agentsMap.find(a => a.ghl_user_id === assignedGhlId);
        if (match) {
          rawAgent = match.name;
        } else if (locationId) {
          console.log(`[WhatsApp Webhook] Owner ID ${assignedGhlId} not in mapping file. Querying GHL Users API...`);
          const userMap = await fetchUserMap(ghlToken, locationId);
          rawAgent = userMap[assignedGhlId] || "Unassigned";
        }
      }
    }

    // Fallback: If agentName is still not resolved, query GHL user map
    if ((!rawAgent || rawAgent === "Unassigned") && agentId && ghlToken && locationId) {
      console.log(`[WhatsApp Webhook] Resolving agent ID: ${agentId} via GHL API...`);
      const userMap = await fetchUserMap(ghlToken, locationId);
      rawAgent = userMap[agentId] || "Unassigned";
    }

    if (!rawAgent) {
      rawAgent = "Unassigned";
    }
    const agentName = normalizeAgentName(rawAgent);

    // 2. Resolve Contact Name from contact_id or raw contactName
    let contactName = data.contactName || "";
    
    if (!contactName && contactId && ghlToken) {
      if (!contact) {
        console.log(`[WhatsApp Webhook] Resolving contact ID: ${contactId} via GHL API...`);
        contact = await fetchContactFromGhl(contactId, ghlToken);
      }
      if (contact) {
        contactName = contact.fullName || `${contact.firstName || ""} ${contact.lastName || ""}`.trim();
      }
    }
    if (!contactName) {
      contactName = "WhatsApp Contact";
    }
    if (contactId) {
      contactName = `${contactName} (${contactId})`;
    }

    let body = data.body || payload.preview || "";
    const timeStr = data.timestamp || data.time || data.status_updated_at || payload.nowIso || new Date().toISOString();
    const messageId = data.wa_message_id || data.wa_id || data.id || payload.wamid || `wa-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    if (!body) {
      const templateName = data.template_name || payload.template_name;
      const messageType = data.message_type || payload.message_type;
      if (templateName) {
        body = `[Template: ${templateName}]`;
      } else if (messageType && messageType !== "text") {
        body = `[${messageType.charAt(0).toUpperCase() + messageType.slice(1)} Message]`;
      } else {
        body = "[WhatsApp Message]";
      }
    }

    // Resolve date string in BST/Europe/London timezone for the file path
    const dateObj = new Date(timeStr);
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    const parts = formatter.formatToParts(dateObj);
    const y = parts.find(p => p.type === "year").value;
    const m = parts.find(p => p.type === "month").value;
    const d = parts.find(p => p.type === "day").value;
    const dateStr = `${y}-${m}-${d}`;

    const owner = process.env.GITHUB_OWNER || process.env.GH_OWNER;
    const repo = process.env.GITHUB_REPO || process.env.GH_REPO;
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

    if (!token || !owner || !repo) {
      console.error("[WhatsApp Webhook] Missing GitHub credentials in environment variables.");
      return NextResponse.json({ error: "GitHub configuration missing" }, { status: 500 });
    }

    const githubApiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/daily_backups/${dateStr}.json`;
    const headers = {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "antigravity-agent"
    };

    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      let sha = null;
      let reportData = {
        agents: {},
        calls: [],
        audit_logs: [],
        ghl_outbound_messages: [],
        ghlMessages: []
      };
      let existsOnGithub = false;

      // 3. Fetch existing daily report from GitHub
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
            console.log(`[WhatsApp Webhook] Attempt ${attempt}: Report size is ${fileData.size} (> 1MB). Fetching via Blob API...`);
            const blobUrl = `https://api.github.com/repos/${owner}/${repo}/git/blobs/${sha}`;
            const blobResponse = await fetch(blobUrl, { headers, cache: "no-store" });
            if (blobResponse.ok) {
              const blobData = await blobResponse.json();
              base64Content = blobData.content;
            }
          }
          
          const cleanBase64 = (base64Content || "").replace(/\s/g, "");
          const decodedContent = Buffer.from(cleanBase64, "base64").toString("utf-8");
          reportData = JSON.parse(decodedContent);
        }
      } catch (err) {
        console.warn(`[WhatsApp Webhook] Attempt ${attempt}: Failed to fetch existing daily backup from GitHub:`, err.message);
      }

      // 4. Initialize outbound message arrays if missing
      if (!reportData.ghl_outbound_messages) {
        reportData.ghl_outbound_messages = reportData.ghlMessages || [];
      }

      // 5. Prevent duplicate message additions
      const isDuplicate = reportData.ghl_outbound_messages.some(msg => msg.id === messageId);
      if (isDuplicate) {
        console.log(`[WhatsApp Webhook] Message ID ${messageId} already exists in report. Skipping.`);
        return NextResponse.json({ success: true, message: "Duplicate message skipped" });
      }

      // 6. Create and append the new WhatsApp message object
      const newWhatsAppMessage = {
        id: messageId,
        agent: agentName || "Unassigned",
        time: dateObj.toISOString(),
        body: body,
        contactName: contactName,
        contactId: contactId,
        type: "whatsapp"
      };

      reportData.ghl_outbound_messages.push(newWhatsAppMessage);
      reportData.ghlMessages = reportData.ghl_outbound_messages; // sync both keys

      // 7. Update summary message count
      if (!reportData.summary) {
        reportData.summary = { total_agents: 0, total_calls: 0, total_actions: 0, total_ghl_messages: 0 };
      }
      reportData.summary.total_ghl_messages = reportData.ghl_outbound_messages.length;

      // 8. Push updated report back to GitHub
      const putPayload = {
        message: `n8n-webhook: add WhatsApp message for ${dateStr} - agent ${agentName || "Unassigned"}`,
        content: Buffer.from(JSON.stringify(reportData, null, 2)).toString("base64")
      };
      if (sha) {
        putPayload.sha = sha;
      }

      console.log(`[WhatsApp Webhook] Attempt ${attempt}: Uploading updated report to GitHub...`);
      const putResponse = await fetch(githubApiUrl, {
        method: "PUT",
        headers: {
          ...headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(putPayload)
      });

      if (putResponse.ok) {
        console.log(`[WhatsApp Webhook] Attempt ${attempt}: Successfully updated report on GitHub.`);
        return NextResponse.json({ success: true, message: "WhatsApp message appended successfully" });
      }

      const errText = await putResponse.text();
      console.warn(`[WhatsApp Webhook] Attempt ${attempt}: Failed to upload report to GitHub (${putResponse.status}): ${errText}`);
      
      if (attempt < maxAttempts) {
        const waitTime = 1000 + Math.random() * 2000;
        console.log(`[WhatsApp Webhook] Conflict or rate-limit. Waiting ${waitTime.toFixed(0)}ms to retry...`);
        await new Promise(r => setTimeout(r, waitTime));
      } else {
        return NextResponse.json({ error: `GitHub PUT error after ${maxAttempts} attempts: ${errText}` }, { status: putResponse.status });
      }
    }
  } catch (error) {
    console.error("[WhatsApp Webhook] Internal Server Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
