/**
 * Dynamic processing engine Standardized to BST (British Summer Time, UTC+1).
 * Replicates and enhances the GHL opportunity, call log, and lead segmentation analytics.
 */

// Normalize agent names spelling and spacing
export function normalizeAgentName(name) {
  if (!name) return "";
  const clean = name.replace(/\s+/g, " ").trim().toLowerCase();
  
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

// Helper to convert date to BST standard timezone-robust checking (interprets string directly as UTC components)
export function toBST(dateStr, targetDateStr = "2026-07-17") {
  if (!dateStr) return null;
  const cleanStr = dateStr.trim();

  // Parse target date components
  const [targetYear, targetMonth, targetDay] = targetDateStr.split("-").map(Number);

  // Try to match hours, minutes, seconds from the string
  const timeRegex = /(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?/i;
  const match = cleanStr.match(timeRegex);

  let hours = 12;
  let minutes = 0;
  let seconds = 0;

  if (match) {
    hours = parseInt(match[1], 10);
    minutes = parseInt(match[2], 10);
    if (match[3]) {
      seconds = parseInt(match[3], 10);
    }
    const ampm = match[4];
    if (ampm) {
      const lower = ampm.toLowerCase();
      if (lower === "pm" && hours < 12) {
        hours += 12;
      } else if (lower === "am" && hours === 12) {
        hours = 0;
      }
    }
  }

  // Parse year, month, and day from the string (forcing UTC) to prevent local browser timezone offset shifts
  let year = targetYear;
  let monthIdx = targetMonth - 1;
  let day = targetDay;

  // Format 1: ISO YYYY-MM-DD
  const isoMatch = cleanStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  // Format 2: US/UK Slash format MM/DD/YYYY or DD/MM/YYYY
  const slashMatch = cleanStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  // Format 3: Named month format "Jul 17, 2026"
  const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  let namedMonthIdx = -1;
  let namedDay = -1;
  let namedYear = -1;

  const monthWords = cleanStr.toLowerCase().replace(/,/g, "").split(/\s+/);
  for (let i = 0; i < monthWords.length; i++) {
    const word = monthWords[i];
    const idx = monthNames.findIndex(m => word.startsWith(m));
    if (idx !== -1) {
      namedMonthIdx = idx;
      const numbers = monthWords.map(w => parseInt(w, 10)).filter(num => !isNaN(num));
      if (numbers.length >= 2) {
        namedYear = numbers.find(num => num > 1900 && num < 2100) || targetYear;
        namedDay = numbers.find(num => num >= 1 && num <= 31 && num !== namedYear) || targetDay;
      }
      break;
    }
  }

  if (isoMatch) {
    year = parseInt(isoMatch[1], 10);
    monthIdx = parseInt(isoMatch[2], 10) - 1;
    day = parseInt(isoMatch[3], 10);
  } else if (slashMatch) {
    const part1 = parseInt(slashMatch[1], 10);
    const part2 = parseInt(slashMatch[2], 10);
    const part3 = parseInt(slashMatch[3], 10);

    year = part3;
    if (part1 === targetMonth || part2 === targetDay) {
      monthIdx = part1 - 1;
      day = part2;
    } else if (part2 === targetMonth || part1 === targetDay) {
      monthIdx = part2 - 1;
      day = part1;
    } else {
      if (part1 > 12) {
        monthIdx = part2 - 1;
        day = part1;
      } else {
        monthIdx = part1 - 1;
        day = part2;
      }
    }
  } else if (namedMonthIdx !== -1) {
    year = namedYear;
    monthIdx = namedMonthIdx;
    day = namedDay;
  }

  return new Date(Date.UTC(year, monthIdx, day, hours, minutes, seconds));
}

// Check if a BST Date object is strictly targetDateStr
export function isJuly17BST(date, targetDateStr = "2026-07-17") {
  if (!date) return false;
  const [yr, mo, dy] = targetDateStr.split("-").map(Number);
  return date.getUTCFullYear() === yr && date.getUTCMonth() === mo - 1 && date.getUTCDate() === dy;
}

// Parse phone number to digits only (digits only, e.g. +447865964771 -> 447865964771)
export function normalizePhone(phoneStr) {
  if (!phoneStr) return "";
  return phoneStr.replace(/\D/g, "");
}

// Parse duration to seconds (e.g. MM:SS or HH:MM:SS)
export function parseDurationToSeconds(durStr) {
  if (!durStr || durStr === "-") return 0;
  const parts = durStr.split(":");
  if (parts.length === 2) {
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  } else if (parts.length === 3) {
    return parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10);
  }
  return 0;
}

export function processAgentData(
  auditLogsRows = [],
  opportunitiesRows = [],
  callLogsRows = [],
  newLeadsRows = [],
  bookedLeadsRows = [],
  apptBookedLeadsRows = [],
  closedLeadsRows = [],
  targetDateStr = "2026-07-17",
  maxBreakGapMinutes = 30,
  nominalActionMinutes = 5
) {
  const oppCounts = {};
  const contactToAgent = {};
  const phoneToAgent = {};

  // 1. Process opportunities.csv
  opportunitiesRows.forEach((row) => {
    const assigned = normalizeAgentName(row.assigned || row.Assigned);
    if (!assigned) return;

    oppCounts[assigned] = (oppCounts[assigned] || 0) + 1;

    const contactName = row["Contact Name"] || row["contact_name"] || row["Contact name"];
    if (contactName) {
      contactToAgent[contactName.trim().toLowerCase()] = assigned;
    }

    const phone = row.phone || row.Phone || row["Contact phone"];
    if (phone) {
      const normPhone = normalizePhone(phone);
      if (normPhone) {
        phoneToAgent[normPhone] = assigned;
      }
    }
  });

  // Helper to map record to agent by phone / contact name
  const findAgent = (phone, name) => {
    if (phone) {
      const normPhone = normalizePhone(phone);
      if (normPhone && phoneToAgent[normPhone]) {
        return phoneToAgent[normPhone];
      }
    }
    if (name) {
      const normName = name.trim().toLowerCase();
      if (contactToAgent[normName]) {
        return contactToAgent[normName];
      }
    }
    return null;
  };

  // 2. Process GHL Lead Segmentations (group by agent and count)
  const agentSegmentations = {};
  const initAgentSegment = (agent) => {
    if (!agentSegmentations[agent]) {
      agentSegmentations[agent] = {
        newLeads: 0,
        bookedLeads: 0,
        apptBookedLeads: 0,
        closedLeads: 0,
        newLeadsToday: 0,
        bookedLeadsToday: 0,
        apptBookedLeadsToday: 0,
      };
    }
  };

  newLeadsRows.forEach((row) => {
    const agent = normalizeAgentName(row["Assigned user"] || row.assigned || findAgent(row["Phone number"], row["Opportunity name"]));
    if (!agent) return;
    initAgentSegment(agent);
    agentSegmentations[agent].newLeads++;

    const bstCreated = toBST(row["Created on"], targetDateStr);
    if (isJuly17BST(bstCreated, targetDateStr)) {
      agentSegmentations[agent].newLeadsToday++;
    }
  });

  bookedLeadsRows.forEach((row) => {
    const agent = normalizeAgentName(row["Assigned user"] || row.assigned || findAgent(row["Phone number"], row["Opportunity name"]));
    if (!agent) return;
    initAgentSegment(agent);
    agentSegmentations[agent].bookedLeads++;

    const bstCreated = toBST(row["Created on"], targetDateStr);
    if (isJuly17BST(bstCreated, targetDateStr)) {
      agentSegmentations[agent].bookedLeadsToday++;
    }
  });

  apptBookedLeadsRows.forEach((row) => {
    const agent = normalizeAgentName(row["Assigned user"] || row.assigned || findAgent(row["Phone number"], row["Opportunity name"]));
    if (!agent) return;
    initAgentSegment(agent);
    agentSegmentations[agent].apptBookedLeads++;

    const bstCreated = toBST(row["Created on"], targetDateStr);
    if (isJuly17BST(bstCreated, targetDateStr)) {
      agentSegmentations[agent].apptBookedLeadsToday++;
    }
  });

  closedLeadsRows.forEach((row) => {
    const agent = normalizeAgentName(row["Assigned user"] || row.assigned || findAgent(row["Phone number"], row["Opportunity name"]));
    if (!agent) return;
    initAgentSegment(agent);
    agentSegmentations[agent].closedLeads++;
  });

  // 3. Process Call logs to BST standard
  const agentCalls = {};
  const bstCallsList = []; // list for visual timeline scatter plot

  callLogsRows.forEach((row) => {
    const cName = row["Contact name"] || row["Contact Name"] || row["contact_name"];
    const cPhone = row["Contact phone"] || row["Contact Phone"] || row["contact_phone"];
    const timestamp = row["Date & time"] || row["Date & Time"] || row["date_time"];
    const duration = row.Duration || row.duration;
    const status = row["Call status"] || row["Call Status"] || row["call_status"];
    const direction = row.Direction || row.direction || "unknown";

    const bstTime = toBST(timestamp, targetDateStr);
    if (!bstTime) return;

    const agent = normalizeAgentName(findAgent(cPhone, cName));
    if (agent) {
      const call = {
        timestamp: bstTime.toISOString(),
        contact_name: cName || "Unknown",
        duration: duration || "-",
        status: status || "-",
        direction: direction || "unknown",
      };

      if (!agentCalls[agent]) {
        agentCalls[agent] = [];
      }
      agentCalls[agent].push(call);

      if (isJuly17BST(bstTime, targetDateStr)) {
        bstCallsList.push({
          agent,
          time: bstTime,
          direction,
          status,
          duration,
        });
      }
    }
  });

  // 4. Process GHL audit logs to BST standard
  const agentActivities = {};
  const bstUpdatesList = []; // list for visual timeline scatter plot
  const stageChangesToday = {};

  auditLogsRows.forEach((row) => {
    const rawAgent = row["Modified By (Name)"] || row["modified_by"];
    const dtVal = row["Date & Time"] || row["date_time"];
    const module = row.Module || row.module;
    const action = row.Action || row.action;
    const details = row.Details || "";

    if (!rawAgent || !dtVal) return;

    const bstTime = toBST(dtVal, targetDateStr);
    if (!bstTime) return;

    const agentClean = normalizeAgentName(rawAgent);
    if (!agentClean) return;

    if (!agentActivities[agentClean]) {
      agentActivities[agentClean] = [];
    }

    const activity = {
      dt: bstTime,
      module: module || "UNKNOWN",
      action: action || "UNKNOWN",
      details,
    };

    agentActivities[agentClean].push(activity);

    if (isJuly17BST(bstTime, targetDateStr)) {
      bstUpdatesList.push({
        agent: agentClean,
        time: bstTime,
        module: activity.module,
        action: activity.action,
        details,
      });

      // Parse pipeline stage changes on July 17 BST
      if (module === "OPPORTUNITY" && details) {
        const match = details.match(/"pipelineStageName"\s*:\s*"([^"]+)"/);
        if (match) {
          const stageName = match[1];
          stageChangesToday[stageName] = (stageChangesToday[stageName] || 0) + 1;
        }
      }
    }
  });

  // 5. Margin summation on July 17, 2026 BST
  const agentMargins = {};
  opportunitiesRows.forEach((row) => {
    const assigned = row.assigned || row.Assigned;
    if (!assigned) return;

    const marginAddedDate = row["Margin Added Date"] || row["margin_added_date"];
    const bstMarginDate = toBST(marginAddedDate, targetDateStr);

    if (isJuly17BST(bstMarginDate, targetDateStr)) {
      const marginVal = parseFloat(row["Margin Amount"] || row["Margin value"] || row["Lead Value"] || 0);
      agentMargins[assigned] = (agentMargins[assigned] || 0) + marginVal;
    }
  });

  // Compile final results dictionary per agent
  const results = {};
  const allAgents = new Set([
    ...Object.keys(agentActivities),
    ...Object.keys(oppCounts),
    ...Object.keys(agentSegmentations),
    ...Object.keys(agentCalls),
  ]);

  allAgents.forEach((agent) => {
    if (!agent) return;
    const activities = agentActivities[agent] || [];

    // Sort activities chronologically
    activities.sort((a, b) => a.dt.getTime() - b.dt.getTime());

    let totalActions = activities.length;
    let firstAction = activities[0] ? activities[0].dt : null;
    let lastAction = activities[activities.length - 1] ? activities[activities.length - 1].dt : null;

    // Detect sessions and breaks
    const sessions = [];
    const breaks = [];

    if (activities.length > 0) {
      let currentSessionStart = firstAction;
      let currentSessionEnd = firstAction;
      let sessionActionsCount = 1;

      for (let i = 1; i < activities.length; i++) {
        const prevTime = activities[i - 1].dt;
        const currTime = activities[i].dt;
        const gapMs = currTime.getTime() - prevTime.getTime();

        if (gapMs > maxBreakGapMinutes * 60 * 1000) {
          sessions.push({
            start: currentSessionStart,
            end: currentSessionEnd,
            actions_count: sessionActionsCount,
          });

          breaks.push({
            start: currentSessionEnd,
            end: currTime,
            duration: gapMs / 1000,
          });

          currentSessionStart = currTime;
          currentSessionEnd = currTime;
          sessionActionsCount = 1;
        } else {
          currentSessionEnd = currTime;
          sessionActionsCount++;
        }
      }

      sessions.push({
        start: currentSessionStart,
        end: currentSessionEnd,
        actions_count: sessionActionsCount,
      });
    }

    let totalActiveSecs = 0;
    const formattedSessions = sessions.map((s) => {
      const spanSecs = (s.end.getTime() - s.start.getTime()) / 1000;
      const durationSecs = spanSecs + nominalActionMinutes * 60;
      totalActiveSecs += durationSecs;
      return {
        start: s.start.toISOString(),
        end: s.end.toISOString(),
        actions_count: s.actions_count,
        duration: durationSecs,
      };
    });

    const formattedBreaks = breaks.map((b) => {
      return {
        start: b.start.toISOString(),
        end: b.end.toISOString(),
        duration: b.duration,
      };
    });

    const totalBreakSecs = formattedBreaks.reduce((sum, b) => sum + b.duration, 0);
    const workdaySpanSecs = firstAction && lastAction ? (lastAction.getTime() - firstAction.getTime()) / 1000 : 0;

    const moduleCounts = {};
    const actionCounts = {};
    const actionsList = [];

    activities.forEach((act) => {
      moduleCounts[act.module] = (moduleCounts[act.module] || 0) + 1;
      actionCounts[act.action] = (actionCounts[act.action] || 0) + 1;
      actionsList.push({
        timestamp: act.dt.toISOString(),
        module: act.module,
        action: act.action,
      });
    });

    // Counts for Stage transitions on July 17, 2026 BST
    let stageInterested = 0;
    let stageContacted = 0;
    let notesCount = 0;

    activities.forEach((act) => {
      if (isJuly17BST(act.dt, targetDateStr)) {
        if (act.module === "NOTE") {
          notesCount++;
        }
        if (act.module === "OPPORTUNITY" && act.details) {
          if (act.details.includes('"pipelineStageName":"Interested"')) {
            stageInterested++;
          }
          if (act.details.includes('"pipelineStageName":"Contacted"')) {
            stageContacted++;
          }
        }
      }
    });

    const seg = agentSegmentations[agent] || {
      newLeads: 0,
      bookedLeads: 0,
      apptBookedLeads: 0,
      closedLeads: 0,
      newLeadsToday: 0,
      bookedLeadsToday: 0,
      apptBookedLeadsToday: 0,
    };

    // Table 1 Calculations
    const opportunitiesCount = oppCounts[agent] || 0;
    const eligibleBase = opportunitiesCount - seg.closedLeads - seg.apptBookedLeads;
    const generalConvRate = eligibleBase > 0 ? (seg.bookedLeads / eligibleBase) * 100 : 0.0;

    // Table 2 Calculations (Today's Converted = Booked today + Appt Booked today)
    const convertedToday = seg.bookedLeadsToday + seg.apptBookedLeadsToday;
    const todayConvRate = seg.newLeadsToday > 0 ? (convertedToday / seg.newLeadsToday) * 100 : 0.0;

    // Table 3 Call Metrics Calculations (for targetDateStr BST only)
    const callsToday = (agentCalls[agent] || []).filter((c) => isJuly17BST(new Date(c.timestamp), targetDateStr));
    
    let outboundCount = 0;
    let outboundAttended = 0;
    let outboundMissed = 0;
    let outboundSeconds = 0;

    let inboundCount = 0;
    let inboundAttended = 0;
    let inboundMissed = 0;
    let inboundSeconds = 0;

    callsToday.forEach((c) => {
      const durSecs = parseDurationToSeconds(c.duration);
      const isAnswered = c.status === "Answered";

      if (c.direction === "outbound") {
        outboundCount++;
        if (isAnswered) {
          outboundAttended++;
          outboundSeconds += durSecs;
        } else {
          outboundMissed++;
        }
      } else {
        inboundCount++;
        if (isAnswered) {
          inboundAttended++;
          inboundSeconds += durSecs;
        } else {
          inboundMissed++;
        }
      }
    });

    results[agent] = {
      // General stats
      total_actions: totalActions,
      first_action: firstAction ? firstAction.toISOString() : null,
      last_action: lastAction ? lastAction.toISOString() : null,
      workday_span: workdaySpanSecs,
      active_duration: totalActiveSecs,
      total_break_duration: totalBreakSecs,
      sessions: formattedSessions,
      breaks: formattedBreaks,
      module_counts: moduleCounts,
      action_counts: actionCounts,
      actions_list: actionsList,
      assigned_opportunities: opportunitiesCount,
      calls: agentCalls[agent] || [],

      // Segmentation stats
      segmentations: seg,
      margin_added_today: agentMargins[agent] || 0,
      stage_interested_today: stageInterested,
      stage_contacted_today: stageContacted,
      notes_updated_today: notesCount,
      general_conv_rate: generalConvRate,

      // Today's Conversion stats (Table 2)
      new_leads_today: seg.newLeadsToday,
      converted_today: convertedToday,
      today_conv_rate: todayConvRate,

      // Call metrics stats (Table 3)
      call_metrics: {
        outboundCount,
        outboundAttended,
        outboundMissed,
        outboundMinutes: outboundSeconds / 60,
        outboundAvgDuration: outboundAttended > 0 ? outboundSeconds / outboundAttended / 60 : 0.0,
        inboundCount,
        inboundAttended,
        inboundMissed,
        inboundMinutes: inboundSeconds / 60,
        inboundAvgDuration: inboundAttended > 0 ? inboundSeconds / inboundAttended / 60 : 0.0,
      },
    };
  });

  return {
    agents: results,
    bstCallsList,
    bstUpdatesList,
    stageChangesToday,
  };
}
