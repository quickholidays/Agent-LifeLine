import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Helper to query GHL API
async function queryGhl(endpoint, token, params = {}) {
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
          Authorization: `Bearer ${token}`,
          Version: "2021-04-15",
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      if (response.status === 429) {
        console.warn("[GHL Recordings API] Rate limit 429 hit. Backing off...");
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`GHL API error (${response.status}): ${errText}`);
      }

      return await response.json();
    } catch (e) {
      if (attempts >= 3) throw e;
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
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
    console.error("[Recordings API] Error fetching users:", err.message);
    return {};
  }
}

// Format duration seconds to MM:SS or HH:MM:SS
function formatDuration(sec) {
  if (!sec || isNaN(sec)) return "00:00";
  const s = parseInt(sec, 10);
  const hrs = Math.floor(s / 3600);
  const min = Math.floor((s % 3600) / 60);
  const secLeft = s % 60;

  if (hrs > 0) {
    return `${String(hrs).padStart(2, "0")}:${String(min).padStart(2, "0")}:${String(secLeft).padStart(2, "0")}`;
  }
  return `${String(min).padStart(2, "0")}:${String(secLeft).padStart(2, "0")}`;
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date"); // e.g. "2026-09-22", "yesterday", "today"
    const tz = searchParams.get("tz") || "BST"; // "BST" (Europe/London) or "PKT" (Asia/Karachi)
    const agentFilter = searchParams.get("agent"); // optional agent name filter
    const limitParam = searchParams.get("limit"); // optional limit

    const ghlToken = process.env.GHL_TOKEN || process.env.NEXT_PUBLIC_GHL_TOKEN;
    const locationId = process.env.GHL_LOCATION_ID || process.env.NEXT_PUBLIC_GHL_LOCATION_ID;

    if (!ghlToken || !locationId) {
      return NextResponse.json(
        { error: "Server GHL credentials missing. Check .env.local" },
        { status: 500 }
      );
    }

    // Determine target timezone name
    const tzName = tz === "PKT" ? "Asia/Karachi" : "Europe/London";

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

    // Calculate Target Date (defaults to YESTERDAY if not supplied or if "yesterday")
    let targetDateStr = "";
    if (!dateParam || dateParam.toLowerCase() === "yesterday") {
      const now = new Date();
      // Calculate yesterday by subtracting 24h
      const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      targetDateStr = parseToLocalDate(yesterdayDate);
    } else if (dateParam.toLowerCase() === "today") {
      targetDateStr = parseToLocalDate(new Date());
    } else {
      targetDateStr = dateParam.trim();
    }

    console.log(`[Recordings API] Fetching call recordings for target date: ${targetDateStr} (${tzName})`);

    // 1. Fetch Users map
    const userMap = await fetchUserMap(ghlToken, locationId);

    // Load local agents map if exists for extra normalization
    let localAgentsMap = [];
    try {
      const mapPath = path.join(process.cwd(), "src", "utils", "agents_map.json");
      if (fs.existsSync(mapPath)) {
        localAgentsMap = JSON.parse(fs.readFileSync(mapPath, "utf-8"));
      }
    } catch (e) {
      // ignore
    }

    // 2. Fetch Conversations active around the target date
    const callRecordings = [];
    let currentStartAfterDate = null;
    let pageCount = 0;
    const maxPages = 40;
    const activeConversations = [];

    while (pageCount < maxPages) {
      pageCount++;
      const params = {
        locationId,
        limit: 25,
        status: "all",
        sortBy: "last_message_date",
        sort: "desc",
      };
      if (currentStartAfterDate) {
        params.startAfterDate = currentStartAfterDate;
      }

      const convData = await queryGhl("/conversations/search", ghlToken, params);
      const conversations = convData.conversations || [];
      if (conversations.length === 0) break;

      let foundOlder = false;

      for (const c of conversations) {
        const lastMsgDate = c.lastMessageDate || c.dateUpdated || c.dateCreated;
        if (!lastMsgDate) continue;

        const lastMsgDateStr = parseToLocalDate(lastMsgDate);

        // Include conversation if last message matches target date or if it's within 3 days after target
        if (
          lastMsgDateStr === targetDateStr ||
          new Date(lastMsgDate) >= new Date(new Date(targetDateStr).getTime())
        ) {
          activeConversations.push(c);
        } else if (
          new Date(lastMsgDate) <
          new Date(new Date(targetDateStr).getTime() - 24 * 60 * 60 * 1000 * 2)
        ) {
          // Stop pagination if we passed beyond target date by > 2 days
          foundOlder = true;
        }
      }

      if (foundOlder) break;

      const lastItem = conversations[conversations.length - 1];
      currentStartAfterDate = lastItem.lastMessageDate || lastItem.dateUpdated || lastItem.dateCreated;
    }

    console.log(
      `[Recordings API] Found ${activeConversations.length} potential conversation threads. Scanning for call recordings...`
    );

    // 3. Scan messages for calls on target date in parallel batches
    const batchSize = 8;
    for (let i = 0; i < activeConversations.length; i += batchSize) {
      const batch = activeConversations.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (c) => {
          try {
            const msgData = await queryGhl(`/conversations/${c.id}/messages`, ghlToken, { limit: 50 });
            const messages = (msgData.messages && msgData.messages.messages) || (Array.isArray(msgData.messages) ? msgData.messages : []);

            if (Array.isArray(messages)) {
              for (const m of messages) {
                const msgDateStr = parseToLocalDate(m.dateAdded);
                if (msgDateStr !== targetDateStr) continue;

                // Check if message is a call
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

                const durationSec = parseInt(
                  m.meta?.call?.duration || m.call?.duration || m.duration || 0,
                  10
                );
                const rawStatus =
                  m.meta?.call?.status || m.call?.status || m.status || "completed";
                const callStatus =
                  rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();

                // Resolve Agent Name
                const msgUserId = m.userId || c.assignedTo;
                let agentName = userMap[msgUserId] || "Unassigned";

                if (agentName === "Unassigned" && msgUserId && localAgentsMap.length > 0) {
                  const match = localAgentsMap.find(
                    (a) => a.id === msgUserId || a.ghl_user_id === msgUserId
                  );
                  if (match) agentName = match.name;
                }

                // Filter by agent if requested
                if (
                  agentFilter &&
                  !agentName.toLowerCase().includes(agentFilter.toLowerCase())
                ) {
                  continue;
                }

                const contactId = c.contactId || c.contact_id || m.contactId || "";
                const baseContactName = c.fullName || c.contactName || "Contact";
                const contactPhone = c.phone || m.to || m.from || "N/A";
                const direction = m.direction || m.call?.direction || "outbound";

                const timeObj = new Date(m.dateAdded);
                const timeFormatter = new Intl.DateTimeFormat("en-US", {
                  timeZone: tzName,
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: false,
                });
                const timeFormatted = isNaN(timeObj.getTime())
                  ? ""
                  : timeFormatter.format(timeObj);

                callRecordings.push({
                  id: m.id,
                  messageId: m.id,
                  conversationId: c.id,
                  contactId,
                  contactName: contactId ? `${baseContactName} (${contactId})` : baseContactName,
                  contactPhone,
                  agent: agentName,
                  agentName,
                  direction,
                  status: callStatus,
                  durationSeconds: isNaN(durationSec) ? 0 : durationSec,
                  durationFormatted: formatDuration(durationSec),
                  date: targetDateStr,
                  dateAdded: m.dateAdded,
                  time: timeFormatted,
                  timezone: tz,
                  from: m.from || m.call?.from || "N/A",
                  to: m.to || m.call?.to || contactPhone,
                  audioUrl: `/api/recordings/audio?messageId=${m.id}`,
                  directRecordingUrl: m.call?.recordingUrl || m.recordingUrl || null,
                  hasRecording: true,
                });
              }
            }
          } catch (err) {
            console.error(
              `[Recordings API] Error fetching messages for conversation ${c.id}:`,
              err.message
            );
          }
        })
      );

      // Small throttle between batches to stay within rate limits
      if (i + batchSize < activeConversations.length) {
        await new Promise((r) => setTimeout(r, 400));
      }
    }

    // Sort recordings chronologically descending (newest first)
    callRecordings.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());

    // Apply limit if specified
    let finalRecordings = callRecordings;
    if (limitParam && !isNaN(parseInt(limitParam, 10))) {
      finalRecordings = callRecordings.slice(0, parseInt(limitParam, 10));
    }

    // Aggregate summary statistics
    const totalDurationSeconds = finalRecordings.reduce((sum, r) => sum + (r.durationSeconds || 0), 0);
    const agentBreakdown = {};
    const statusBreakdown = {};
    const directionBreakdown = { inbound: 0, outbound: 0 };

    finalRecordings.forEach((r) => {
      agentBreakdown[r.agentName] = (agentBreakdown[r.agentName] || 0) + 1;
      statusBreakdown[r.status] = (statusBreakdown[r.status] || 0) + 1;
      if (r.direction === "inbound") directionBreakdown.inbound++;
      else directionBreakdown.outbound++;
    });

    return NextResponse.json({
      success: true,
      targetDate: targetDateStr,
      timezone: tzName,
      totalRecordings: finalRecordings.length,
      summary: {
        totalCalls: finalRecordings.length,
        totalDurationSeconds,
        totalDurationFormatted: formatDuration(totalDurationSeconds),
        directionBreakdown,
        agentBreakdown,
        statusBreakdown,
      },
      recordings: finalRecordings,
    });
  } catch (error) {
    console.error("[Recordings API] Fatal Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
