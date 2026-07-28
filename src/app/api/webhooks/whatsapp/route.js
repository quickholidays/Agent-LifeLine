import { NextResponse } from "next/server";

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

    const rawAgent = payload.agent || payload.agentName || "Unassigned";
    const agentName = normalizeAgentName(rawAgent);
    
    const contactName = payload.contactName || "WhatsApp Contact";
    const body = payload.body || "";
    const timeStr = payload.timestamp || payload.time || new Date().toISOString();
    const messageId = payload.id || `wa-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    if (!body) {
      return NextResponse.json({ error: "Missing message body" }, { status: 400 });
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

    let sha = null;
    let reportData = {
      agents: {},
      calls: [],
      audit_logs: [],
      ghl_outbound_messages: [],
      ghlMessages: []
    };
    let existsOnGithub = false;

    // 1. Fetch existing daily report from GitHub
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
          console.log(`[WhatsApp Webhook] Report size is ${fileData.size} (> 1MB). Fetching via Blob API...`);
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
      console.warn("[WhatsApp Webhook] Failed to fetch existing daily backup from GitHub:", err.message);
    }

    // 2. Initialize outbound message arrays if missing
    if (!reportData.ghl_outbound_messages) {
      reportData.ghl_outbound_messages = reportData.ghlMessages || [];
    }

    // 3. Prevent duplicate message additions
    const isDuplicate = reportData.ghl_outbound_messages.some(msg => msg.id === messageId);
    if (isDuplicate) {
      console.log(`[WhatsApp Webhook] Message ID ${messageId} already exists in report. Skipping.`);
      return NextResponse.json({ success: true, message: "Duplicate message skipped" });
    }

    // 4. Create and append the new WhatsApp message object
    const newWhatsAppMessage = {
      id: messageId,
      agent: agentName || "Unassigned",
      time: dateObj.toISOString(),
      body: body,
      contactName: contactName,
      type: "whatsapp"
    };

    reportData.ghl_outbound_messages.push(newWhatsAppMessage);
    reportData.ghlMessages = reportData.ghl_outbound_messages; // sync both keys

    // 5. Update summary message count
    if (!reportData.summary) {
      reportData.summary = { total_agents: 0, total_calls: 0, total_actions: 0, total_ghl_messages: 0 };
    }
    reportData.summary.total_ghl_messages = reportData.ghl_outbound_messages.length;

    // 6. Push updated report back to GitHub
    const putPayload = {
      message: `n8n-webhook: add WhatsApp message for ${dateStr} - agent ${agentName || "Unassigned"}`,
      content: Buffer.from(JSON.stringify(reportData, null, 2)).toString("base64")
    };
    if (sha) {
      putPayload.sha = sha;
    }

    console.log(`[WhatsApp Webhook] Uploading updated report to GitHub...`);
    const putResponse = await fetch(githubApiUrl, {
      method: "PUT",
      headers: {
        ...headers,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(putPayload)
    });

    if (putResponse.ok) {
      console.log(`[WhatsApp Webhook] Successfully updated report on GitHub.`);
      return NextResponse.json({ success: true, message: "WhatsApp message appended successfully" });
    } else {
      const errText = await putResponse.text();
      console.error(`[WhatsApp Webhook] Failed to upload report to GitHub (${putResponse.status}):`, errText);
      return NextResponse.json({ error: `GitHub PUT error: ${errText}` }, { status: putResponse.status });
    }
  } catch (error) {
    console.error("[WhatsApp Webhook] Internal Server Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
