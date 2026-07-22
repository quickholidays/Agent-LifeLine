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
export function toBST(dateStr, targetDateStr = "2026-07-17", timezone = "BST") {
  if (!dateStr) return null;
  const cleanStr = dateStr.trim();

  // If the date string is an ISO string containing Z or T (e.g., from GHL API)
  if (cleanStr.includes("T") || cleanStr.endsWith("Z")) {
    const d = new Date(cleanStr);
    if (!isNaN(d.getTime())) {
      // Convert UTC timestamp into target timezone's local date components
      const tzName = timezone === "PKT" ? "Asia/Karachi" : "Europe/London";
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: tzName,
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: false
      });
      const parts = formatter.formatToParts(d);
      const year = parseInt(parts.find(p => p.type === "year").value, 10);
      const month = parseInt(parts.find(p => p.type === "month").value, 10) - 1;
      const day = parseInt(parts.find(p => p.type === "day").value, 10);
      const hour = parseInt(parts.find(p => p.type === "hour").value, 10);
      const minute = parseInt(parts.find(p => p.type === "minute").value, 10);
      const second = parseInt(parts.find(p => p.type === "second").value, 10);

      return new Date(Date.UTC(year, month, day, hour, minute, second));
    }
  }

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
  nominalActionMinutes = 5,
  timezone = "BST",
  isMarginOnly = false,
  contactsRows = []
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

  // Helper to populate maps from other source arrays
  const populateAgentMaps = (rows, agentCol, phoneCol, nameCol) => {
    rows.forEach(row => {
      const assigned = normalizeAgentName(row[agentCol] || row["assigned"] || row["Assigned"] || row["Assigned user"] || row["assignedTo"] || row["Assigned To"]);
      if (!assigned) return;

      const name = row[nameCol];
      if (name) {
        const cleanName = name.trim().toLowerCase();
        if (!contactToAgent[cleanName]) {
          contactToAgent[cleanName] = assigned;
        }
      }

      const phone = row[phoneCol];
      if (phone) {
        const normPhone = normalizePhone(phone);
        if (normPhone && !phoneToAgent[normPhone]) {
          phoneToAgent[normPhone] = assigned;
        }
      }
    });
  };

  // Populate from lead segmentations
  populateAgentMaps(newLeadsRows, "Assigned user", "Phone number", "Opportunity name");
  populateAgentMaps(bookedLeadsRows, "Assigned user", "Phone number", "Opportunity name");
  populateAgentMaps(apptBookedLeadsRows, "Assigned user", "Phone number", "Opportunity name");
  populateAgentMaps(closedLeadsRows, "Assigned user", "Phone number", "Opportunity name");

  // Populate from smart list contacts
  contactsRows.forEach(row => {
    const assigned = normalizeAgentName(row["Assigned To"] || row["assignedTo"]);
    if (!assigned) return;

    const firstName = row["First Name"] || "";
    const lastName = row["Last Name"] || "";
    const fullName = `${firstName} ${lastName}`.trim().toLowerCase();
    if (fullName && !contactToAgent[fullName]) {
      contactToAgent[fullName] = assigned;
    }

    const phone = row["Phone"] || row["phone"];
    if (phone) {
      const normPhone = normalizePhone(phone);
      if (normPhone && !phoneToAgent[normPhone]) {
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

  // Helper to dynamically find date field values by patterns
  const getRowDateField = (row, patterns, fallback) => {
    if (!row) return "";
    const keys = Object.keys(row);
    for (const pat of patterns) {
      const matchKey = keys.find(k => k && k.toLowerCase().includes(pat));
      if (matchKey && row[matchKey]) {
        return row[matchKey];
      }
    }
    return row[fallback] || "";
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
        closedLeadsToday: 0,
        referrals: 0,
        referralsToday: 0,
      };
    }
  };

  newLeadsRows.forEach((row) => {
    const agent = normalizeAgentName(row["Assigned user"] || row.assigned || findAgent(row["Phone number"], row["Opportunity name"]));
    if (!agent) return;
    initAgentSegment(agent);

    const isReferral = [row["Referal"], row["Referral"], row["referal"], row["referral"], row["Source"], row["source"]].some(val =>
      val && ["referal", "referral", "yes", "true"].includes(String(val).trim().toLowerCase())
    );

    if (isReferral) {
      agentSegmentations[agent].referrals++;
      agentSegmentations[agent].referralsToday++;
    } else {
      agentSegmentations[agent].newLeads++;
      agentSegmentations[agent].newLeadsToday++;
    }
  });

  // Build lookup sets for new leads shared today to enforce same-day conversion validation
  const newLeadsPhones = new Set();
  const newLeadsEmails = new Set();
  const newLeadsIds = new Set();

  newLeadsRows.forEach((row) => {
    const phone = (row["Phone number"] || row["phone"] || "").replace(/[^0-9+]/g, "").trim();
    const email = (row["Email"] || row["email"] || "").trim().toLowerCase();
    const oppId = (row["Opportunity ID"] || row["Opportunity ID"] || row["opportunityId"] || row["id"] || "").trim();

    if (phone) newLeadsPhones.add(phone);
    if (email) newLeadsEmails.add(email);
    if (oppId) newLeadsIds.add(oppId);
  });

  bookedLeadsRows.forEach((row) => {
    const agent = normalizeAgentName(row["Assigned user"] || row.assigned || findAgent(row["Phone number"], row["Opportunity name"]));
    if (!agent) return;
    initAgentSegment(agent);
    agentSegmentations[agent].bookedLeads++;
    agentSegmentations[agent].bookedLeadsToday++;
  });

  apptBookedLeadsRows.forEach((row) => {
    const agent = normalizeAgentName(row["Assigned user"] || row.assigned || findAgent(row["Phone number"], row["Opportunity name"]));
    if (!agent) return;
    initAgentSegment(agent);
    agentSegmentations[agent].apptBookedLeads++;
    agentSegmentations[agent].apptBookedLeadsToday++;
  });

  closedLeadsRows.forEach((row) => {
    const agent = normalizeAgentName(row["Assigned user"] || row.assigned || findAgent(row["Phone number"], row["Opportunity name"]));
    if (!agent) return;
    initAgentSegment(agent);
    agentSegmentations[agent].closedLeads++;
    agentSegmentations[agent].closedLeadsToday++;
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

    const bstTime = toBST(timestamp, targetDateStr, timezone);
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
    const moduleName = row.Module || row.module;
    const action = row.Action || row.action;
    const details = row.Details || "";

    if (!rawAgent || !dtVal) return;

    const bstTime = toBST(dtVal, targetDateStr, timezone);
    if (!bstTime) return;

    const agentClean = normalizeAgentName(rawAgent);
    if (!agentClean) return;

    if (!agentActivities[agentClean]) {
      agentActivities[agentClean] = [];
    }

    const activity = {
      dt: bstTime,
      module: moduleName || "UNKNOWN",
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
      if (moduleName === "OPPORTUNITY" && details) {
        const match = details.match(/"pipelineStageName"\s*:\s*"([^"]+)"/);
        if (match) {
          const stageName = match[1];
          stageChangesToday[stageName] = (stageChangesToday[stageName] || 0) + 1;
        }
      }
    }
  });

  // 5. Margin summation on target day BST
  const agentMargins = {};
  opportunitiesRows.forEach((row) => {
    const assignedRaw = row.assigned || row.Assigned || row["Assigned user"] || row["Assigned User"];
    if (!assignedRaw) return;
    const assigned = normalizeAgentName(assignedRaw);

    if (isMarginOnly) {
      // For margin-only reports, treat rows as correct date and sum by Lead value
      const leadVal = parseFloat(row["Lead value"] || row["Lead Value"] || 0);
      agentMargins[assigned] = (agentMargins[assigned] || 0) + leadVal;
    } else {
      // For regular opportunity list, verify Margin Amount matches Lead value, on the correct target date
      const marginAddedDate = row["Margin Added Date"] || row["margin_added_date"];
      if (!marginAddedDate) return;

      const bstMarginDate = toBST(marginAddedDate, targetDateStr, "BST");
      if (isJuly17BST(bstMarginDate, targetDateStr)) {
        const marginValRaw = row["Margin Amount"] || row["Margin amount"] || "0";
        const leadValRaw = row["Lead value"] || row["Lead Value"] || "0";

        const marginVal = parseFloat(marginValRaw);
        if (!isNaN(marginVal) && marginVal > 0) {
          agentMargins[assigned] = (agentMargins[assigned] || 0) + marginVal;
        }
      }
    }
  });

  // Compile raw new leads and margin opportunities details per agent
  const agentNewLeadsDetails = {};
  newLeadsRows.forEach((row) => {
    const agent = normalizeAgentName(row["Assigned user"] || row.assigned || findAgent(row["Phone number"], row["Opportunity name"]));
    if (!agent) return;

    const isReferral = [row["Referal"], row["Referral"], row["referal"], row["referal"], row["Source"], row["source"]].some(val =>
      val && ["referal", "referral", "yes", "true"].includes(String(val).trim().toLowerCase())
    );
    if (isReferral) return; // Skip referrals from Today's New Leads details!

    if (!agentNewLeadsDetails[agent]) agentNewLeadsDetails[agent] = [];
    agentNewLeadsDetails[agent].push({
      name: row["Opportunity name"] || row["Primary Contact name"] || row["Contact name"] || row["Contact Name"] || row["contact_name"] || "Unknown",
      email: row["Email"] || "",
      phone: row["Phone number"] || "",
      tags: row["Tags"] || "",
      source: row["Source"] || "",
      assigned: agent,
      created: row["Created on"]
    });
  });

  const getRowVal = (row, keys) => {
    for (const k of keys) {
      if (row[k] !== undefined) return row[k];
      const lowerKey = k.toLowerCase();
      const foundKey = Object.keys(row).find(rk => rk.toLowerCase() === lowerKey);
      if (foundKey && row[foundKey] !== undefined) return row[foundKey];
    }
    return "";
  };

  const agentMarginDetails = {};
  opportunitiesRows.forEach((row) => {
    const assignedRaw = row.assigned || row.Assigned || row["Assigned user"] || row["Assigned User"] || row["Assigned To"] || row["assignedTo"];
    if (!assignedRaw) return;
    const assigned = normalizeAgentName(assignedRaw);

    const nameVal = getRowVal(row, ["Opportunity name", "Opportunity Name", "Primary Contact name", "Primary Contact Name", "Contact name", "Contact Name"]);
    const stageVal = getRowVal(row, ["Stage", "stage"]);
    const statusVal = getRowVal(row, ["Status", "status"]);
    const sourceVal = getRowVal(row, ["Source", "source"]);
    const phoneVal = getRowVal(row, ["Phone number", "Phone Number", "phone", "Phone"]);
    const emailVal = getRowVal(row, ["Email", "email"]);

    if (isMarginOnly) {
      const leadVal = parseFloat(getRowVal(row, ["Lead value", "Lead Value", "margin", "Margin", "Margin Amount", "Margin amount"]) || 0);
      if (!agentMarginDetails[assigned]) agentMarginDetails[assigned] = [];
      agentMarginDetails[assigned].push({
        name: nameVal || "Unknown",
        margin: leadVal,
        date: targetDateStr,
        stage: stageVal,
        status: statusVal,
        source: sourceVal,
        phone: phoneVal,
        email: emailVal,
        agent: assigned
      });
    } else {
      const marginAddedDate = row["Margin Added Date"] || row["margin_added_date"];
      if (!marginAddedDate) return;
      const bstMarginDate = toBST(marginAddedDate, targetDateStr, timezone);
      if (isJuly17BST(bstMarginDate, targetDateStr)) {
        const marginValRaw = row["Margin Amount"] || row["Margin amount"] || "0";
        const marginVal = parseFloat(marginValRaw);
        if (!isNaN(marginVal) && marginVal > 0) {
          if (!agentMarginDetails[assigned]) agentMarginDetails[assigned] = [];
          agentMarginDetails[assigned].push({
            name: nameVal || "Unknown",
            margin: marginVal,
            date: marginAddedDate,
            stage: stageVal,
            status: statusVal,
            source: sourceVal,
            phone: phoneVal,
            email: emailVal,
            agent: assigned
          });
        }
      }
    }
  });

  // Compile today's conversion leads details per agent (treating all rows as active today)
  const agentTodayConversions = {};
  bookedLeadsRows.forEach((row) => {
    const agent = normalizeAgentName(row["Assigned user"] || row.assigned || findAgent(row["Phone number"], row["Opportunity name"]));
    if (!agent) return;
    const rawDate = getRowDateField(row, ["booked time", "booked date", "booking time", "booking date", "booked at", "booked_time", "booked_date", "booking_time", "booking_date"], "Created on");
    if (!agentTodayConversions[agent]) agentTodayConversions[agent] = [];
    agentTodayConversions[agent].push({
      name: row["Opportunity name"] || row["Primary Contact name"] || "Unknown",
      phone: row["Phone number"] || "",
      email: row["Email"] || "",
      stage: "Booked",
      date: rawDate,
      agent: agent
    });
  });

  apptBookedLeadsRows.forEach((row) => {
    const agent = normalizeAgentName(row["Assigned user"] || row.assigned || findAgent(row["Phone number"], row["Opportunity name"]));
    if (!agent) return;
    const rawDate = getRowDateField(row, ["appointment date", "appointment time", "appointment_date", "appointment_time", "appt date", "appt time", "appt_date", "appt_time", "appointment"], "Created on");
    if (!agentTodayConversions[agent]) agentTodayConversions[agent] = [];
    const exists = agentTodayConversions[agent].some(l => l.phone === row["Phone number"] || l.email === row["Email"]);
    if (!exists) {
      agentTodayConversions[agent].push({
        name: row["Opportunity name"] || row["Primary Contact name"] || "Unknown",
        phone: row["Phone number"] || "",
        email: row["Email"] || "",
        stage: "Appointment Booked",
        date: rawDate,
        agent: agent
      });
    }
  });

  // Compile booked, closed, and appt booked details per agent
  const agentBookedLeads = {};
  bookedLeadsRows.forEach((row) => {
    const agent = normalizeAgentName(row["Assigned user"] || row.assigned || findAgent(row["Phone number"], row["Opportunity name"]));
    if (!agent) return;
    if (!agentBookedLeads[agent]) agentBookedLeads[agent] = [];
    agentBookedLeads[agent].push({
      name: row["Opportunity name"] || row["Primary Contact name"] || "Unknown",
      phone: row["Phone number"] || "",
      email: row["Email"] || "",
      stage: row["Stage"] || "Booked",
      date: row["Created on"] || row["Booked Date"] || row["booking date"] || "",
      agent: agent
    });
  });

  const agentClosedLeads = {};
  closedLeadsRows.forEach((row) => {
    const agent = normalizeAgentName(row["Assigned user"] || row.assigned || findAgent(row["Phone number"], row["Opportunity name"]));
    if (!agent) return;
    if (!agentClosedLeads[agent]) agentClosedLeads[agent] = [];
    agentClosedLeads[agent].push({
      name: row["Opportunity name"] || row["Primary Contact name"] || "Unknown",
      phone: row["Phone number"] || "",
      email: row["Email"] || "",
      stage: row["Stage"] || "Closed Won",
      date: row["Created on"] || row["Closed Date"] || row["closed date"] || "",
      agent: agent
    });
  });

  const agentApptBookedLeads = {};
  apptBookedLeadsRows.forEach((row) => {
    const agent = normalizeAgentName(row["Assigned user"] || row.assigned || findAgent(row["Phone number"], row["Opportunity name"]));
    if (!agent) return;
    if (!agentApptBookedLeads[agent]) agentApptBookedLeads[agent] = [];
    agentApptBookedLeads[agent].push({
      name: row["Opportunity name"] || row["Primary Contact name"] || "Unknown",
      phone: row["Phone number"] || "",
      email: row["Email"] || "",
      stage: row["Stage"] || "Appointment Booked",
      date: row["Created on"] || row["Appointment Date"] || row["appointment date"] || "",
      agent: agent
    });
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
        details: act.details || "",
      });
    });

    // Counts for Stage transitions on July 17, 2026 BST
    let stageInterested = 0;
    let stageContacted = 0;
    let notesCount = 0;
    let tasksCount = 0;

    activities.forEach((act) => {
      if (isJuly17BST(act.dt, targetDateStr)) {
        if (act.module === "NOTE") {
          notesCount++;
        }
        if (act.module === "TASK") {
          tasksCount++;
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
      closedLeadsToday: 0,
      referrals: 0,
      referralsToday: 0,
    };

    // Table 1 Calculations
    const opportunitiesCount = oppCounts[agent] || 0;
    const eligibleBase = opportunitiesCount - seg.closedLeads - seg.apptBookedLeads;
    const generalConvRate = eligibleBase > 0 ? (seg.bookedLeads / eligibleBase) * 100 : 0.0;

    // Table 2 Calculations (Today's Converted = Booked today + Closed today)
    const convertedToday = seg.bookedLeadsToday + seg.closedLeadsToday;
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

    // Calculate unique interacted leads and conversions
    const interactedLeads = new Set();
    const interactedConversions = new Set();

    actionsList.forEach(act => {
      let leadId = null;
      if (act.details) {
        try {
          const detailsObj = typeof act.details === "string" ? JSON.parse(act.details) : act.details;
          leadId = detailsObj.contactId || detailsObj.opportunityId || detailsObj.id;
        } catch (e) {
          const m1 = act.details.match(/"contactId"\s*:\s*"([^"]+)"/);
          const m2 = act.details.match(/"opportunityId"\s*:\s*"([^"]+)"/);
          const m3 = act.details.match(/"id"\s*:\s*"([^"]+)"/);
          leadId = (m1 && m1[1]) || (m2 && m2[1]) || (m3 && m3[1]);
        }
      }
      if (leadId) {
        interactedLeads.add(leadId);
        const isConvertedStage = act.module === "OPPORTUNITY" && act.details &&
          (act.details.includes('"pipelineStageName":"Booked"') ||
            act.details.includes('"pipelineStageName":"Appointment Booked"') ||
            act.details.includes('"status":"won"'));
        if (isConvertedStage) {
          interactedConversions.add(leadId);
        }
      }
    });

    const interactedLeadsCount = interactedLeads.size;
    const interactedConversionsCount = interactedConversions.size;

    results[agent] = {
      interacted_leads_today: interactedLeadsCount,
      interacted_conversions_today: interactedConversionsCount,
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
      new_leads_details: agentNewLeadsDetails[agent] || [],
      margin_opportunities_details: agentMarginDetails[agent] || [],
      today_conversion_leads: agentTodayConversions[agent] || [],
      booked_leads_details: agentBookedLeads[agent] || [],
      closed_leads_details: agentClosedLeads[agent] || [],
      appt_booked_leads_details: agentApptBookedLeads[agent] || [],

      // Segmentation stats
      segmentations: seg,
      margin_added_today: agentMargins[agent] || 0,
      stage_interested_today: stageInterested,
      stage_contacted_today: stageContacted,
      notes_updated_today: notesCount,
      tasks_added_today: tasksCount,
      general_conv_rate: generalConvRate,

      // Today's Conversion stats (Table 2)
      new_leads_today: seg.newLeadsToday,
      referrals_today: seg.referralsToday || 0,
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
