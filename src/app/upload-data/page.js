"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import CustomDatePicker from "@/components/CustomDatePicker";
import { parseCSV } from "@/utils/csvParser";
import { processAgentData, toBST, isJuly17BST } from "@/utils/analysisEngine";
import Login from "@/components/Login";

export default function UploadDataPage() {
  const [theme, setTheme] = useState("dark");
  const [reportDate, setReportDate] = useState(() => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Karachi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(yesterday);
    const year = parts.find(p => p.type === "year").value;
    const month = parts.find(p => p.type === "month").value;
    const day = parts.find(p => p.type === "day").value;
    return `${year}-${month}-${day}`;
  });
  const [timezone, setTimezone] = useState("PKT");

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMounted, setAuthMounted] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userRole");
    document.cookie = "userRole=; path=/; max-age=0; SameSite=Lax";
    setIsLoggedIn(false);
  };

  useEffect(() => {
    setAuthMounted(true);
    setIsLoggedIn(localStorage.getItem("isLoggedIn") === "true");
  }, []);
  const [syncConversations, setSyncConversations] = useState(false);
  const [ghlToken, setGhlToken] = useState("");
  const [ghlLocationId, setGhlLocationId] = useState("");
  
  // Files states
  const [auditFiles, setAuditFiles] = useState([]);
  const [oppsFile, setOppsFile] = useState(null);
  const [callsFile, setCallsFile] = useState(null);
  const [newLeadsFile, setNewLeadsFile] = useState(null);
  const [bookedLeadsFile, setBookedLeadsFile] = useState(null);
  const [apptLeadsFile, setApptLeadsFile] = useState(null);
  const [closedLeadsFile, setClosedLeadsFile] = useState(null);
  const [contactsFile, setContactsFile] = useState(null);
  const [jsonFile, setJsonFile] = useState(null);

  const [uploadMode, setUploadMode] = useState("bulk"); // 'bulk' or 'single' or 'json'
  const [processStatus, setProcessStatus] = useState("");
  const [processingState, setProcessingState] = useState(null);

  // Step-by-Step Onboarding States
  const [currentStepIdx, setCurrentStepIdx] = useState(-1);
  const [stepDetails, setStepDetails] = useState("");
  const [stepStatus, setStepStatus] = useState(""); // 'processing', 'waiting-for-user', 'confirm-upload', 'error'
  const [tempParsedData, setTempParsedData] = useState({
    auditRows: [],
    oppsRows: [],
    callsRows: [],
    newLeadsRows: [],
    bookedRows: [],
    apptRows: [],
    closedRows: [],
    contactsRows: [],
    originalOppsRows: []
  });
  const [compiledData, setCompiledData] = useState(null);

  // Custom Alert & Confirm Popup States
  const [customPopup, setCustomPopup] = useState(null);

  const showCustomConfirm = (message, confirmLabel = "Overwrite", cancelLabel = "Cancel") => {
    return new Promise((resolve) => {
      setCustomPopup({
        type: "confirm",
        message,
        confirmLabel,
        cancelLabel,
        onConfirm: () => {
          setCustomPopup(null);
          resolve(true);
        },
        onCancel: () => {
          setCustomPopup(null);
          resolve(false);
        }
      });
    });
  };

  const showCustomAlert = (message) => {
    return new Promise((resolve) => {
      setCustomPopup({
        type: "alert",
        message,
        onConfirm: () => {
          setCustomPopup(null);
          resolve();
        }
      });
    });
  };

  // Load theme and GHL configurations on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("theme") || "light";
      setTheme(savedTheme);
      if (savedTheme === "light") {
        document.body.classList.add("light-mode");
        document.body.classList.remove("dark-mode");
      } else {
        document.body.classList.add("dark-mode");
        document.body.classList.remove("light-mode");
      }

      setGhlToken(localStorage.getItem("ghl_token") || process.env.NEXT_PUBLIC_GHL_TOKEN || "");
      setGhlLocationId(localStorage.getItem("ghl_location_id") || process.env.NEXT_PUBLIC_GHL_LOCATION_ID || "");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    if (nextTheme === "light") {
      document.body.classList.add("light-mode");
      document.body.classList.remove("dark-mode");
    } else {
      document.body.classList.add("dark-mode");
      document.body.classList.remove("light-mode");
    }
  };

  const handleGhlTokenChange = (val) => {
    setGhlToken(val);
    localStorage.setItem("ghl_token", val);
  };

  const handleGhlLocationChange = (val) => {
    setGhlLocationId(val);
    localStorage.setItem("ghl_location_id", val);
  };

  const readFileText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  const handleJsonUpload = async (file) => {
    if (!file) return;
    try {
      setJsonFile(file);
      setStepStatus("processing");
      setStepDetails("Reading and parsing pre-compiled JSON report file...");
      setCurrentStepIdx(7);
      
      const text = await readFileText(file);
      const parsedData = JSON.parse(text);
      
      if (!parsedData || typeof parsedData !== "object" || !parsedData.agents) {
        throw new Error("Invalid report file format. Expected a JSON object containing an 'agents' property.");
      }
      
      let dateMatch = file.name.match(/(\d{4}-\d{2}-\d{2})/);
      let detectedDate = dateMatch ? dateMatch[1] : reportDate;
      if (dateMatch) {
        setReportDate(detectedDate);
      }
      
      setCompiledData(parsedData);
      setStepDetails(`JSON report file parsed successfully.\nTarget Date (detected from file): ${detectedDate}\nTotal agents in report: ${Object.keys(parsedData.agents).length}\n\nAll datasets parsed and compiled successfully! Ready to save.`);
      setStepStatus("confirm-upload");
      
      setProcessingState({
        progressPercent: 95,
        steps: [
          { id: "read-json", name: "Parsing JSON Report File", status: "done" },
          { id: "confirm-save", name: "Confirming and Saving compiled backup", status: "processing" }
        ]
      });
    } catch (err) {
      console.error(err);
      setStepStatus("error");
      setStepDetails(`Failed to parse JSON file: ${err.message}`);
      await showCustomAlert(`Invalid JSON Report: ${err.message}`);
    }
  };

  const handleBulkFiles = (e) => {
    const files = Array.from(e.target.files);
    const identifiedAudits = [];
    let identifiedOpps = oppsFile;
    let identifiedCalls = callsFile;
    let identifiedNew = newLeadsFile;
    let identifiedBooked = bookedLeadsFile;
    let identifiedAppt = apptLeadsFile;
    let identifiedClosed = closedLeadsFile;
    let identifiedContacts = contactsFile;

    files.forEach((file) => {
      const name = file.name.toLowerCase();
      if (name.includes("opportunity") || name.includes("opportunities") || name.includes("margin")) {
        identifiedOpps = file;
      } else if (
        name.includes("call-report") ||
        name.includes("call report") ||
        name.includes("call_report") ||
        name.includes("call logs") ||
        name.includes("call log")
      ) {
        identifiedCalls = file;
      } else if (name.includes("new leads") || name.includes("new_leads")) {
        identifiedNew = file;
      } else if (
        name.includes("appointment booked") ||
        name.includes("appt booked") ||
        name.includes("appointment_booked")
      ) {
        identifiedAppt = file;
      } else if (
        name.includes("booked leads") ||
        name.includes("booked_leads") ||
        name.includes("booked")
      ) {
        if (!name.includes("appointment")) {
          identifiedBooked = file;
        }
      } else if (name.includes("closed leads") || name.includes("closed_leads")) {
        identifiedClosed = file;
      } else if (name.includes("export_contacts") || name.includes("export contacts") || name.includes("contact")) {
        identifiedContacts = file;
      } else {
        identifiedAudits.push(file);
      }
    });

    if (identifiedAudits.length > 0) setAuditFiles(identifiedAudits);
    if (identifiedOpps) setOppsFile(identifiedOpps);
    if (identifiedCalls) setCallsFile(identifiedCalls);
    if (identifiedNew) setNewLeadsFile(identifiedNew);
    if (identifiedBooked) setBookedLeadsFile(identifiedBooked);
    if (identifiedAppt) setApptLeadsFile(identifiedAppt);
    if (identifiedClosed) setClosedLeadsFile(identifiedClosed);
    if (identifiedContacts) setContactsFile(identifiedContacts);
  };

  // Mock outbound messages helper
  const getMockOutboundMessages = (dateStr) => {
    const mockConvs = [
      {
        agentName: "Agent 11",
        fullName: "Contact 1",
        messages: [
          { id: "m1_2", body: "Hello Contact 1! The government visa fee is £180. We also charge a documentation service fee. Let me know if you would like to book a call to check your eligibility?", direction: "outbound", timestamp: "15:32" },
          { id: "m1_4", body: "I have a slot at 3:45 PM BST. Does that work?", direction: "outbound", timestamp: "15:34" }
        ]
      },
      {
        agentName: "Agent 11",
        fullName: "Contact 2",
        messages: [
          { id: "m2_2", body: "Yes Contact 2, we do! Which university are you looking at?", direction: "outbound", timestamp: "16:10" },
          { id: "m2_4", body: "Excellent choice. We have a dedicated team for UK student visas.", direction: "outbound", timestamp: "16:15" }
        ]
      },
      {
        agentName: "Agent 1",
        fullName: "Contact 3",
        messages: [
          { id: "m3_2", body: "Hi Contact 3! Yes, I received them. They are currently being verified by our compliance team.", direction: "outbound", timestamp: "12:17" },
          { id: "m3_4", body: "I will keep you updated. Have a great day!", direction: "outbound", timestamp: "12:20" }
        ]
      },
      {
        agentName: "Agent 1",
        fullName: "Contact 4",
        messages: [
          { id: "m4_2", body: "Hi Contact 4! It's booked for July 25th at 10 AM.", direction: "outbound", timestamp: "10:42" }
        ]
      },
      {
        agentName: "Agent 8",
        fullName: "Contact 5",
        messages: [
          { id: "m5_2", body: "Hi Contact 5, no problem. I have rescheduled it to next Monday at 2 PM. You should receive a confirmation email shortly.", direction: "outbound", timestamp: "14:15" }
        ]
      },
      {
        agentName: "Agent 8",
        fullName: "Contact 6",
        messages: [
          { id: "m6_2", body: "Hello Contact 6, our documentation fee is non-refundable as it covers our manual verification and filing services. However, we ensure a 99% success rate before we submit.", direction: "outbound", timestamp: "09:12" }
        ]
      }
    ];

    const list = [];
    mockConvs.forEach(c => {
      c.messages.forEach(m => {
        list.push({
          id: m.id,
          agent: c.agentName,
          time: new Date(`${dateStr}T${m.timestamp}:00`),
          body: m.body,
          contactName: c.fullName,
          type: "message"
        });
      });
    });
    return list;
  };

  // Live GHL API fetch helper
  const fetchGhlOutboundMessages = async (targetDate, token, locationId, contactsRows = [], tz = "BST") => {
    try {
      const usersRes = await fetch("/api/ghl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: "/users/",
          token,
          params: { locationId }
        })
      });
      const usersData = await usersRes.json();
      if (usersData.error) throw new Error(usersData.error);
      const userMap = {};
      if (usersData.users) {
        usersData.users.forEach(u => {
          userMap[u.id] = u.name;
        });
      }

      const outboundMsgs = [];

      const isSameDate = (activityStr, targetDateStr) => {
        if (!activityStr) return false;
        try {
          const d = new Date(activityStr);
          if (!isNaN(d.getTime())) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}` === targetDateStr;
          }
        } catch (e) {}

        const parts = targetDateStr.split('-');
        const year = parts[0];
        const monthInt = parseInt(parts[1], 10);
        const dayInt = parseInt(parts[2], 10);
        const monthsAbbr = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
        const abbr = monthsAbbr[monthInt - 1];
        const normalized = activityStr.toLowerCase();
        return normalized.includes(year) && normalized.includes(abbr) && normalized.includes(String(dayInt));
      };

      // Filter contacts from contactsRows that have Last Activity on targetDate
      const targetContacts = contactsRows.filter(row => {
        const activityVal = row["Last Activity"] || row["last_activity"] || "";
        return isSameDate(activityVal, targetDate);
      });

      console.log(`Syncing GHL chat records for ${targetContacts.length} contacts created on ${targetDate}...`);

      for (const contact of targetContacts) {
        const contactId = contact["Contact Id"] || contact["contactId"] || contact["id"] || "";
        if (!contactId) continue;

        // Search for the conversation thread matching this contact ID
        const searchRes = await fetch("/api/ghl", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: "/conversations/search",
            token,
            params: {
              locationId,
              contactId
            }
          })
        });

        if (!searchRes.ok) continue;
        const searchData = await searchRes.json();
        const conversations = searchData.conversations || [];
        if (conversations.length === 0) continue;

        const conv = conversations[0];

        // Fetch messages for this conversation thread
        const msgRes = await fetch("/api/ghl", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: `/conversations/${conv.id}/messages`,
            token,
            params: { limit: 100 }
          })
        });

        if (!msgRes.ok) continue;
        const msgData = await msgRes.json();
        
        // GHL Messages API returns messages nested under messages.messages
        const messages = (msgData.messages && msgData.messages.messages) || [];

        // Keep only messages added on the targetDate (exactly on this day, "not before")
        const dayMessages = messages.filter(m => {
          if (!m.dateAdded) return false;
          const datePart = m.dateAdded.split("T")[0];
          return datePart === targetDate;
        });

        // Filter and map outbound messages into flat structure
        dayMessages
          .filter(m => m.direction === "outbound" && (m.type === "message" || m.messageType === "TYPE_SMS" || m.messageType === "TYPE_EMAIL" || m.type === "TYPE_SMS" || m.type === "TYPE_EMAIL"))
          .forEach(m => {
            outboundMsgs.push({
              id: m.id,
              agent: userMap[conv.assignedTo] || userMap[conv.userId] || "GHL Agent",
              time: m.dateAdded,
              body: m.body || "[Media or Attachment]",
              contactName: conv.contactName || conv.fullName || (contact["First Name"] + " " + contact["Last Name"]) || "Contact",
              type: "message"
            });
          });
      }

      return outboundMsgs;
    } catch (e) {
      console.error("Failed to load GHL messages by contact ID", e);
      return [];
    }
  };

  const runOnboardingStep = async (stepIdx, currentTempData) => {
    try {
      if (stepIdx === 0) {
        // Step 1: Parse Opportunities Database
        let oppsRows = [];
        if (oppsFile) {
          const text = await readFileText(oppsFile);
          oppsRows = parseCSV(text);
        }
        const nextData = { ...currentTempData, oppsRows, originalOppsRows: oppsRows };
        setTempParsedData(nextData);
        setStepDetails(`Opportunities database loaded.\nTotal Opportunities parsed: ${oppsRows.length}`);
        setStepStatus("waiting-for-user");

        setProcessingState(prev => {
          if (!prev) return null;
          const updatedSteps = [...prev.steps];
          updatedSteps[0].status = "done";
          if (updatedSteps[1]) updatedSteps[1].status = "processing";
          return {
            ...prev,
            steps: updatedSteps,
            progressPercent: 15
          };
        });
      }
      else if (stepIdx === 1) {
        // Step 2: Read GHL Agent Logs & Filter Interacted Opportunities
        const auditRows = [];
        for (const file of auditFiles) {
          const text = await readFileText(file);
          const rows = parseCSV(text);
          auditRows.push(...rows);
        }

        const auditOppIds = new Set();
        auditRows.forEach(row => {
          const docId = row['Document ID'] || row['document_id'];
          const moduleName = row['Module'] || row['module'];
          const details = row['Details'] || row['details'] || '';

          if (moduleName === 'OPPORTUNITY' && docId) {
            auditOppIds.add(docId);
          }

          if (details) {
            try {
              const detailsObj = JSON.parse(details);
              if (detailsObj.relations && Array.isArray(detailsObj.relations)) {
                detailsObj.relations.forEach(rel => {
                  if (rel.objectKey === 'opportunity' && rel.recordId) {
                    auditOppIds.add(rel.recordId);
                  }
                });
              }
            } catch (e) {
              const match = details.match(/"objectKey"\s*:\s*"opportunity"\s*,\s*"recordId"\s*:\s*"([^"]+)"/);
              if (match) auditOppIds.add(match[1]);
              const match2 = details.match(/"recordId"\s*:\s*"([^"]+)"\s*,\s*"objectKey"\s*:\s*"opportunity"/);
              if (match2) auditOppIds.add(match2[1]);
            }
          }
        });

        const filteredOpps = currentTempData.oppsRows.filter(row => {
          const oppId = row['Opportunity ID'] || row['opportunityId'] || row['id'];
          return oppId && auditOppIds.has(oppId);
        });

        const nextData = { ...currentTempData, auditRows, oppsRows: filteredOpps };
        setTempParsedData(nextData);
        setStepDetails(`Parsed ${auditFiles.length} GHL Agent Log files.\nTotal log rows: ${auditRows.length}\nUnique opportunities with audit activity: ${auditOppIds.size}\nInteracted opportunities kept: ${filteredOpps.length} (dropped ${currentTempData.oppsRows.length - filteredOpps.length} inactive ones)`);
        setStepStatus("waiting-for-user");

        setProcessingState(prev => {
          if (!prev) return null;
          const updatedSteps = [...prev.steps];
          updatedSteps[1].status = "done";
          if (updatedSteps[2]) updatedSteps[2].status = "processing";
          return {
            ...prev,
            steps: updatedSteps,
            progressPercent: 30
          };
        });
      }
      else if (stepIdx === 2) {
        // Step 3: Load Call Report Logs
        let callsRows = [];
        if (callsFile) {
          const text = await readFileText(callsFile);
          callsRows = parseCSV(text);
        }
        let outboundCount = 0;
        let missedInboundCount = 0;
        callsRows.forEach(row => {
          const direction = (row.Direction || row.direction || '').toLowerCase();
          const status = (row['Call status'] || row['Call Status'] || row.status || '').toLowerCase();
          if (direction === 'outbound') {
            outboundCount++;
          } else if (direction === 'inbound' && status !== 'answered') {
            missedInboundCount++;
          }
        });
        const nextData = { ...currentTempData, callsRows };
        setTempParsedData(nextData);
        setStepDetails(`Call report log parsed successfully.\nTotal call logs: ${callsRows.length}\nOutbound calls: ${outboundCount}\nMissed inbound calls (Inbound not Answered): ${missedInboundCount}`);
        setStepStatus("waiting-for-user");

        setProcessingState(prev => {
          if (!prev) return null;
          const updatedSteps = [...prev.steps];
          updatedSteps[2].status = "done";
          if (updatedSteps[3]) updatedSteps[3].status = "processing";
          return {
            ...prev,
            steps: updatedSteps,
            progressPercent: 45
          };
        });
      }
      else if (stepIdx === 3) {
        // Step 4: Parse New Leads & Separate Referrals
        let newLeadsRows = [];
        if (newLeadsFile) {
          const text = await readFileText(newLeadsFile);
          newLeadsRows = parseCSV(text);
        }
        let referrals = 0;
        let others = 0;
        newLeadsRows.forEach(row => {
          const isReferral = [row["Referal"], row["Referral"], row["referal"], row["referral"], row["Source"], row["source"]].some(val =>
            val && ["referal", "referral", "yes", "true"].includes(String(val).trim().toLowerCase())
          );
          if (isReferral) referrals++;
          else others++;
        });
        const nextData = { ...currentTempData, newLeadsRows };
        setTempParsedData(nextData);
        setStepDetails(`New leads segmentation file parsed.\nTotal new leads today: ${newLeadsRows.length}\nReferrals: ${referrals}\nStandard leads (Others): ${others}`);
        setStepStatus("waiting-for-user");

        setProcessingState(prev => {
          if (!prev) return null;
          const updatedSteps = [...prev.steps];
          updatedSteps[3].status = "done";
          if (updatedSteps[4]) updatedSteps[4].status = "processing";
          return {
            ...prev,
            steps: updatedSteps,
            progressPercent: 60
          };
        });
      }
      else if (stepIdx === 4) {
        // Step 5: Load Bookings, Appts, Closed Leads
        let bookedRows = [];
        if (bookedLeadsFile) {
          const text = await readFileText(bookedLeadsFile);
          bookedRows = parseCSV(text);
        }
        let apptRows = [];
        if (apptLeadsFile) {
          const text = await readFileText(apptLeadsFile);
          apptRows = parseCSV(text);
        }
        let closedRows = [];
        if (closedLeadsFile) {
          const text = await readFileText(closedLeadsFile);
          closedRows = parseCSV(text);
        }
        const nextData = { ...currentTempData, bookedRows, apptRows, closedRows };
        setTempParsedData(nextData);
        setStepDetails(`Bookings & stage transitions loaded:\n- Booked Leads: ${bookedRows.length}\n- Appointment Booked: ${apptRows.length}\n- Closed Leads: ${closedRows.length}`);
        setStepStatus("waiting-for-user");

        setProcessingState(prev => {
          if (!prev) return null;
          const updatedSteps = [...prev.steps];
          updatedSteps[4].status = "done";
          if (updatedSteps[5]) updatedSteps[5].status = "processing";
          return {
            ...prev,
            steps: updatedSteps,
            progressPercent: 75
          };
        });
      }
      else if (stepIdx === 5) {
        // Step 6: Calculate Margin Generated Today
        let totalMargin = 0;
        const isMarginOnly = oppsFile && oppsFile.name.toLowerCase().includes("margin");
        currentTempData.originalOppsRows.forEach(row => {
          if (isMarginOnly) {
            const leadVal = parseFloat(row["Lead value"] || row["Lead Value"] || 0);
            totalMargin += leadVal;
          } else {
            const marginAddedDate = row["Margin Added Date"] || row["margin_added_date"];
            if (marginAddedDate) {
              const bstMarginDate = toBST(marginAddedDate, reportDate, "BST");
              if (isJuly17BST(bstMarginDate, reportDate)) {
                const marginValRaw = row["Margin Amount"] || row["Margin amount"] || "0";
                const marginVal = parseFloat(marginValRaw);
                if (!isNaN(marginVal) && marginVal > 0) {
                  totalMargin += marginVal;
                }
              }
            }
          }
        });

        setStepDetails(`Opportunities scanned for daily margin added on date ${reportDate}.\nTotal Margin Generated today: £${totalMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
        setStepStatus("waiting-for-user");

        setProcessingState(prev => {
          if (!prev) return null;
          const updatedSteps = [...prev.steps];
          updatedSteps[5].status = "done";
          if (updatedSteps[6]) updatedSteps[6].status = "processing";
          return {
            ...prev,
            steps: updatedSteps,
            progressPercent: 85
          };
        });
      }
      else if (stepIdx === 6) {
        // Step 7: Load Contacts database & GHL message integration
        let contactsRows = [];
        if (contactsFile) {
          const text = await readFileText(contactsFile);
          contactsRows = parseCSV(text);
        }

        if (syncConversations && contactsRows.length === 0) {
          throw new Error("Please upload the Contacts Export CSV file to pull live GHL chat messages.");
        }

        const nextData = { ...currentTempData, contactsRows };
        setTempParsedData(nextData);

        let summaryText = `Contacts database parsed successfully.\nTotal contacts parsed: ${contactsRows.length}`;

        // Compile everything
        const isMarginOnly = oppsFile && oppsFile.name.toLowerCase().includes("margin");
        const processed = processAgentData(
          currentTempData.auditRows,
          currentTempData.originalOppsRows, // Use unfiltered opps so processAgentData can count all opportunities properly!
          currentTempData.callsRows,
          currentTempData.newLeadsRows,
          currentTempData.bookedRows,
          currentTempData.apptRows,
          currentTempData.closedRows,
          reportDate,
          30,
          5,
          timezone,
          isMarginOnly,
          contactsRows
        );

        // Sync Outbound Messages
        let msgList = [];
        if (syncConversations && ghlToken && ghlLocationId) {
          summaryText += `\nFetching conversations for target date ${reportDate} from GHL API...`;
          try {
            msgList = await fetchGhlOutboundMessages(reportDate, ghlToken, ghlLocationId, contactsRows, timezone);
            summaryText += `\nLive Sync Complete: Exchanged messages with ${new Set(msgList.map(m => m.fullName || m.contactName)).size} contacts.`;
          } catch (err) {
            summaryText += `\nLive Sync failed, fell back to simulated messages.`;
            msgList = getMockOutboundMessages(reportDate);
          }
        }
        processed.ghl_outbound_messages = msgList;
        setCompiledData(processed);

        setStepDetails(`${summaryText}\n\nAll datasets parsed and compiled successfully!`);
        setStepStatus("confirm-upload");

        setProcessingState(prev => {
          if (!prev) return null;
          const updatedSteps = [...prev.steps];
          updatedSteps[6].status = "done";
          if (updatedSteps[7]) updatedSteps[7].status = "processing";
          return {
            ...prev,
            steps: updatedSteps,
            progressPercent: 95
          };
        });
      }
    } catch (err) {
      console.error(err);
      setStepStatus("error");
      setProcessingState(prev => {
        if (!prev) return null;
        const updatedSteps = [...prev.steps];
        if (updatedSteps[stepIdx]) updatedSteps[stepIdx].status = "error";
        return {
          ...prev,
          steps: updatedSteps,
          error: err.message
        };
      });
    }
  };

  const processUploadedFiles = async () => {
    if (auditFiles.length === 0) return;

    const steps = [
      { id: "read-opps", name: "Parsing CRM Opportunities Database", status: "processing" },
      { id: "filter-opps", name: "Filtering Interacted Opportunities using GHL Audit Logs", status: "pending" },
      { id: "read-calls", name: "Parsing Call Report Logs", status: "pending" },
      { id: "read-new-leads", name: "Segmenting New Leads & Referrals", status: "pending" },
      { id: "read-bookings", name: "Loading Bookings, Appointment Booked, & Closed Leads", status: "pending" },
      { id: "calc-margin", name: "Calculating Margin Generated Today", status: "pending" },
      { id: "read-contacts", name: "Loading Contacts & Fetching Conversations", status: "pending" },
      { id: "confirm-upload", name: "Confirming and Saving compiled backup", status: "pending" }
    ];

    const initialData = {
      auditRows: [],
      oppsRows: [],
      callsRows: [],
      newLeadsRows: [],
      bookedRows: [],
      apptRows: [],
      closedRows: [],
      contactsRows: [],
      originalOppsRows: []
    };

    setTempParsedData(initialData);
    setCurrentStepIdx(0);
    setStepStatus("processing");
    setStepDetails("Initializing Opportunities Database parsing...");

    setProcessingState({
      steps,
      progressPercent: 5,
    });

    await runOnboardingStep(0, initialData);
  };

  const handleNextStep = async () => {
    const nextIdx = currentStepIdx + 1;
    setCurrentStepIdx(nextIdx);
    setStepStatus("processing");
    setStepDetails(`Running Step ${nextIdx + 1}...`);
    await runOnboardingStep(nextIdx, tempParsedData);
  };

  const handleConfirmUpload = async () => {
    try {
      setStepStatus("processing");
      setStepDetails("Uploading backup to GitHub repository...");

      let dataToUpload = { ...compiledData };

      // Check if file exists to warn/confirm overwrite
      const checkRes = await fetch(`/api/backup?date=${reportDate}`);
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        if (checkData.exists) {
          const overwrite = await showCustomConfirm(
            `A backup file for ${reportDate} already exists in your GitHub repository. Do you want to overwrite it?`,
            "Overwrite",
            "Cancel"
          );
          if (!overwrite) {
            setProcessingState(null);
            setProcessStatus("");
            setCurrentStepIdx(-1);
            return; // Abort
          }

          const overwriteConvs = await showCustomConfirm(
            "Do you want to overwrite the GHL conversation / chat history on GitHub as well, or keep the existing conversations from the previous backup?",
            "Overwrite Chat",
            "Keep Existing Chat"
          );
          if (!overwriteConvs) {
            const existingData = checkData.data || {};
            dataToUpload.ghl_outbound_messages = existingData.ghl_outbound_messages || existingData.ghlMessages || [];
            if (existingData.ghlMessages) {
              dataToUpload.ghlMessages = existingData.ghlMessages;
            }
          }
        }
      }

      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: dataToUpload,
          date: reportDate
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `GitHub Backup failed (${res.status})`);
      }

      setProcessingState(prev => {
        if (!prev) return null;
        const updatedSteps = [...prev.steps];
        updatedSteps[7].status = "done";
        return {
          ...prev,
          steps: updatedSteps,
          progressPercent: 100
        };
      });

      await new Promise(resolve => setTimeout(resolve, 800));
      setProcessingState(null);
      setProcessStatus("");
      setCurrentStepIdx(-1);
      await showCustomAlert(`Successfully processed and saved backup to GitHub for date: ${reportDate}`);

      // Redirect to main dashboard page with target date parameter
      window.location.href = `/?date=${reportDate}`;
    } catch (err) {
      console.error(err);
      setStepStatus("error");
      setProcessingState(prev => {
        if (!prev) return null;
        const updatedSteps = [...prev.steps];
        updatedSteps[7].status = "error";
        return {
          ...prev,
          steps: updatedSteps,
          error: err.message
        };
      });
    }
  };

  const handleSkipUpload = async () => {
    const saveLocally = await showCustomConfirm(
      "Would you like to save this report locally on the dashboard server (skipping GitHub upload) before closing?"
    );

    if (saveLocally) {
      try {
        setStepStatus("processing");
        setStepDetails("Saving report locally on server...");

        let dataToUpload = { ...compiledData };

        const checkRes = await fetch(`/api/backup?date=${reportDate}`);
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (checkData.exists) {
            const overwrite = await showCustomConfirm(
              `A local backup file for ${reportDate} already exists. Do you want to overwrite it?`,
              "Overwrite",
              "Cancel"
            );
            if (!overwrite) {
              setProcessingState(null);
              setProcessStatus("");
              setCurrentStepIdx(-1);
              return; // Abort
            }

            const overwriteConvs = await showCustomConfirm(
              "Do you want to overwrite the local GHL conversation / chat history as well, or keep the existing conversations from the previous backup?",
              "Overwrite Chat",
              "Keep Existing Chat"
            );
            if (!overwriteConvs) {
              const existingData = checkData.data || {};
              dataToUpload.ghl_outbound_messages = existingData.ghl_outbound_messages || existingData.ghlMessages || [];
              if (existingData.ghlMessages) {
                dataToUpload.ghlMessages = existingData.ghlMessages;
              }
            }
          }
        }

        const res = await fetch(`/api/backup?skipGithub=true`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: dataToUpload,
            date: reportDate
          })
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || `Local Save failed (${res.status})`);
        }

        await showCustomAlert(`Successfully saved report locally for date: ${reportDate}`);
      } catch (err) {
        await showCustomAlert(`Failed to save locally: ${err.message}`);
      }
    }

    setProcessingState(null);
    setProcessStatus("");
    setCurrentStepIdx(-1);
    window.location.href = `/?date=${reportDate}`;
  };

  if (!authMounted) return null;
  if (!isLoggedIn) {
    return <Login onSuccess={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="upload-layout" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "var(--bg-color)" }}>
      <header style={{ borderBottom: "1px solid var(--card-border)", padding: "1.2rem 2.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 100, backgroundColor: "var(--bg-color)", marginTop: 0, paddingTop: "1.2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
          <img src="/logo.png" alt="LifeLine Logo" style={{ height: "30px", width: "auto" }} />
          <h2 style={{ margin: 0, fontSize: "1.4rem" }}>LifeLine Onboarding Portal</h2>
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <Link href="/" className="btn-primary-small" style={{ textDecoration: "none", backgroundColor: "rgba(255,255,255,0.05)", color: "var(--text-primary)", border: "1px solid var(--card-border)" }}>
            <i className="fa-solid fa-arrow-left"></i> Back to Dashboard
          </Link>
          <button id="theme-toggle" className="btn-theme" onClick={toggleTheme}>
            <i className={`fa-solid ${theme === "dark" ? "fa-moon" : "fa-sun"}`}></i>
          </button>
          <button
            className="btn-theme"
            title="Logout"
            onClick={handleLogout}
            style={{
              color: "#e26939"
            }}
          >
            <i className="fa-solid fa-right-from-bracket"></i>
          </button>
        </div>
      </header>

      <main className="upload-main-area" style={{ padding: "3rem 2.5rem", maxWidth: "1200px", margin: "0 auto", width: "100%", flex: 1 }}>
        <section className="card" style={{ padding: "2.5rem" }}>
          <div style={{ marginBottom: "2rem" }}>
            <h2 style={{ fontSize: "1.5rem", display: "flex", alignItems: "center", gap: "0.6rem", fontWeight: 800 }}>
              <i className="fa-solid fa-cloud-arrow-up" style={{ color: "var(--primary)" }}></i> Daily Datasets Onboarding
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginTop: "0.4rem" }}>
              Upload your CRM report files to standardize timezone conversions and generate dashboard metrics.
            </p>
          </div>

          {/* GoHighLevel API Integration & Report Date Configuration */}
          <div
            style={{
              background: "var(--card-bg, rgba(209, 92, 46, 0.04))",
              border: "2px solid var(--card-border, #e5e7eb)",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.03)",
              borderRadius: "14px",
              padding: "2rem",
              marginBottom: "2.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem"
            }}
          >
            <h3 style={{ fontSize: "1.2rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <i className="fa-regular fa-calendar-check" style={{ color: "var(--primary)" }}></i> Workspace & Date Configuration
            </h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", margin: 0, lineHeight: "1.4" }}>
              Configure your workspace target date and GoHighLevel credentials. Changing the date will automatically filter and sync activity logs and conversations.
            </p>

            {/* Row 1: Target Report Date, Target Timezone, Live API Sync */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem", marginTop: "0.2rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.4rem", color: "var(--text-secondary)" }}>
                  Target Report Date
                </label>
                <CustomDatePicker
                  value={reportDate}
                  onChange={(val) => setReportDate(val)}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.4rem", color: "var(--text-secondary)" }}>
                  Target Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.8rem",
                    borderRadius: "8px",
                    background: "var(--input-bg)",
                    border: "1px solid var(--input-border)",
                    color: "var(--text-primary)",
                    fontSize: "0.88rem",
                    outline: "none",
                    cursor: "pointer"
                  }}
                >
                  <option value="BST">British Summer Time (BST, UTC+1)</option>
                  <option value="PKT">Pakistan Standard Time (PKT, UTC+5)</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.4rem", color: "var(--text-secondary)" }}>
                  Live API Sync
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", height: "38px" }}>
                  <input
                    type="checkbox"
                    id="sync-conversations-checkbox"
                    checked={syncConversations}
                    onChange={(e) => setSyncConversations(e.target.checked)}
                    style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "var(--primary)" }}
                  />
                  <label htmlFor="sync-conversations-checkbox" style={{ fontSize: "0.85rem", color: "var(--text-primary)", cursor: "pointer", userSelect: "none" }}>
                    Pull live chat messages
                  </label>
                </div>
              </div>
            </div>

            {/* Row 2: Location ID, Private Integration Key */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.4rem", color: "var(--text-secondary)" }}>
                  Location ID
                </label>
                <input
                  type="text"
                  value={ghlLocationId}
                  onChange={(e) => handleGhlLocationChange(e.target.value)}
                  placeholder="e.g. gCr3FJTylSWPTvuQjR6V"
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.8rem",
                    borderRadius: "8px",
                    background: "var(--input-bg)",
                    border: "1px solid var(--input-border)",
                    color: "var(--text-primary)",
                    fontSize: "0.88rem",
                    outline: "none"
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.4rem", color: "var(--text-secondary)" }}>
                  Private Integration Key
                </label>
                <input
                  type="password"
                  value={ghlToken}
                  onChange={(e) => handleGhlTokenChange(e.target.value)}
                  placeholder="pit-xxxxxx..."
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.8rem",
                    borderRadius: "8px",
                    background: "var(--input-bg)",
                    border: "1px solid var(--input-border)",
                    color: "var(--text-primary)",
                    fontSize: "0.88rem",
                    outline: "none"
                  }}
                />
              </div>
            </div>
          </div>

          {/* Mode Switcher */}
          <div style={{ display: "flex", gap: "1.25rem", marginBottom: "2.5rem", borderBottom: "1px solid var(--card-border)", paddingBottom: "1.25rem" }}>
            <button
              onClick={() => setUploadMode("bulk")}
              style={{
                background: uploadMode === "bulk" ? "var(--primary)" : "transparent",
                color: uploadMode === "bulk" ? "white" : "var(--text-secondary)",
                padding: "0.65rem 1.5rem",
                borderRadius: "8px",
                border: uploadMode === "bulk" ? "none" : "1px solid var(--card-border)",
                fontWeight: 700,
                fontSize: "0.85rem",
                cursor: "pointer",
                boxShadow: uploadMode === "bulk" ? "0 4px 12px var(--primary-glow)" : "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                transition: "all 0.3s ease"
              }}
            >
              <i className="fa-solid fa-folder-open"></i> Bulk Upload
            </button>
            <button
              onClick={() => setUploadMode("single")}
              style={{
                background: uploadMode === "single" ? "var(--primary)" : "transparent",
                color: uploadMode === "single" ? "white" : "var(--text-secondary)",
                padding: "0.65rem 1.5rem",
                borderRadius: "8px",
                border: uploadMode === "single" ? "none" : "1px solid var(--card-border)",
                fontWeight: 700,
                fontSize: "0.85rem",
                cursor: "pointer",
                boxShadow: uploadMode === "single" ? "0 4px 12px var(--primary-glow)" : "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                transition: "all 0.3s ease"
              }}
            >
              <i className="fa-solid fa-file-csv"></i> Single Uploads
            </button>
            <button
              onClick={() => setUploadMode("json")}
              style={{
                background: uploadMode === "json" ? "var(--primary)" : "transparent",
                color: uploadMode === "json" ? "white" : "var(--text-secondary)",
                padding: "0.65rem 1.5rem",
                borderRadius: "8px",
                border: uploadMode === "json" ? "none" : "1px solid var(--card-border)",
                fontWeight: 700,
                fontSize: "0.85rem",
                cursor: "pointer",
                boxShadow: uploadMode === "json" ? "0 4px 12px var(--primary-glow)" : "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                transition: "all 0.3s ease"
              }}
            >
              <i className="fa-solid fa-file-code"></i> JSON Report Upload
            </button>
          </div>

          {/* Bulk All-in-One Upload Area */}
          {uploadMode === "bulk" && (
            <div
              style={{
                border: "2px dashed var(--primary)",
                borderRadius: "12px",
                padding: "2.5rem 1.5rem",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem",
                background: "rgba(209, 92, 46, 0.03)",
                marginBottom: "1.5rem",
              }}
            >
              <i className="fa-solid fa-folder-open" style={{ fontSize: "2.5rem", color: "var(--primary)" }}></i>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700 }}>All-in-One Bulk Document Upload</h3>
              <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: "0 auto", maxWidth: "600px" }}>
                Select or drag all your CRM documents at once. We'll automatically identify opportunities, calls, audit logs, and lead segmentations!
              </p>
              <input
                type="file"
                multiple
                accept=".csv"
                onChange={handleBulkFiles}
                style={{ display: "none" }}
                id="bulk-file-upload-input"
              />
              <label
                htmlFor="bulk-file-upload-input"
                className="btn-primary-small"
                style={{ alignSelf: "center", marginTop: "0.5rem", padding: "0.65rem 1.5rem", cursor: "pointer", fontSize: "0.88rem" }}
              >
                <i className="fa-solid fa-plus"></i> Select All Files At Once
              </label>
            </div>
          )}

          {/* JSON Upload Area */}
          {uploadMode === "json" && (
            <div
              style={{
                border: "2px dashed var(--primary)",
                borderRadius: "12px",
                padding: "2.5rem 1.5rem",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem",
                background: "rgba(209, 92, 46, 0.03)",
                marginBottom: "1.5rem",
              }}
            >
              <i className="fa-solid fa-file-code" style={{ fontSize: "2.5rem", color: "var(--primary)" }}></i>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700 }}>Pre-compiled JSON Report Upload</h3>
              <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: "0 auto", maxWidth: "600px" }}>
                Select or drag a pre-compiled dashboard JSON report file (e.g. <code>lifeline_report_YYYY-MM-DD.json</code>).
              </p>
              <input
                type="file"
                accept=".json"
                onChange={(e) => handleJsonUpload(e.target.files[0] || null)}
                style={{ display: "none" }}
                id="json-file-upload-input"
              />
              <label
                htmlFor="json-file-upload-input"
                className="btn-primary-small"
                style={{ alignSelf: "center", marginTop: "0.5rem", padding: "0.65rem 1.5rem", cursor: "pointer", fontSize: "0.88rem" }}
              >
                <i className="fa-solid fa-file-import"></i> Choose JSON File
              </label>
              {jsonFile && (
                <div style={{ fontSize: "0.78rem", color: "var(--text-primary)", fontWeight: 600, marginTop: "0.5rem" }}>
                  Selected: {jsonFile.name}
                </div>
              )}
            </div>
          )}

          {/* Single Uploads Section */}
          {uploadMode === "single" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginBottom: "1.5rem" }}>
              <div style={{ background: "rgba(255, 255, 255, 0.01)", border: "1px solid var(--card-border)", borderRadius: "12px", padding: "1.5rem" }}>
                <h4 style={{ fontSize: "0.95rem", fontWeight: 800, marginBottom: "1.25rem", color: "var(--text-primary)" }}>
                  Upload Files Individually
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem" }}>
                  {/* 1. GHL Logs */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                      1. GHL Audit Logs (multiple):
                    </label>
                    <div className="custom-file-input-wrapper">
                      <input
                        type="file"
                        multiple
                        accept=".csv"
                        onChange={(e) => setAuditFiles(Array.from(e.target.files))}
                      />
                      <div className="custom-file-label" style={{ borderLeft: "3px solid var(--primary)" }}>
                        <i className="fa-solid fa-file-csv"></i>{" "}
                        {auditFiles.length > 0 ? `${auditFiles.length} logs chosen` : "Choose Audit Logs..."}
                      </div>
                    </div>
                  </div>

                  {/* 2. Opportunities */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                      2. Opportunities Database:
                    </label>
                    <div className="custom-file-input-wrapper">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => setOppsFile(e.target.files[0] || null)}
                      />
                      <div className="custom-file-label" style={{ borderLeft: "3px solid var(--info)" }}>
                        <i className="fa-solid fa-database"></i>{" "}
                        {oppsFile ? oppsFile.name : "Choose Opportunities..."}
                      </div>
                    </div>
                  </div>

                  {/* 3. Call Logs */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                      3. Call Report Log:
                    </label>
                    <div className="custom-file-input-wrapper">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => setCallsFile(e.target.files[0] || null)}
                      />
                      <div className="custom-file-label" style={{ borderLeft: "3px solid var(--warning)" }}>
                        <i className="fa-solid fa-phone"></i>{" "}
                        {callsFile ? callsFile.name : "Choose Call Report..."}
                      </div>
                    </div>
                  </div>

                  {/* 4. New Leads */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                      4. New Leads Segmentation:
                    </label>
                    <div className="custom-file-input-wrapper">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => setNewLeadsFile(e.target.files[0] || null)}
                      />
                      <div className="custom-file-label" style={{ borderLeft: "3px solid var(--info)" }}>
                        <i className="fa-solid fa-user-plus"></i>{" "}
                        {newLeadsFile ? newLeadsFile.name : "Choose New Leads..."}
                      </div>
                    </div>
                  </div>

                  {/* 5. Booked Leads */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                      5. Booked Leads:
                    </label>
                    <div className="custom-file-input-wrapper">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => setBookedLeadsFile(e.target.files[0] || null)}
                      />
                      <div className="custom-file-label" style={{ borderLeft: "3px solid var(--success)" }}>
                        <i className="fa-solid fa-calendar-check"></i>{" "}
                        {bookedLeadsFile ? bookedLeadsFile.name : "Choose Booked..."}
                      </div>
                    </div>
                  </div>

                  {/* 6. Appt Booked Leads */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                      6. Appt Booked Leads:
                    </label>
                    <div className="custom-file-input-wrapper">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => setApptLeadsFile(e.target.files[0] || null)}
                      />
                      <div className="custom-file-label" style={{ borderLeft: "3px solid var(--warning)" }}>
                        <i className="fa-solid fa-calendar-days"></i>{" "}
                        {apptLeadsFile ? apptLeadsFile.name : "Choose Appt Booked..."}
                      </div>
                    </div>
                  </div>

                  {/* 7. Closed Leads */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                      7. Closed Leads:
                    </label>
                    <div className="custom-file-input-wrapper">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => setClosedLeadsFile(e.target.files[0] || null)}
                      />
                      <div className="custom-file-label" style={{ borderLeft: "3px solid var(--danger)" }}>
                        <i className="fa-solid fa-circle-xmark"></i>{" "}
                        {closedLeadsFile ? closedLeadsFile.name : "Choose Closed..."}
                      </div>
                    </div>
                  </div>

                  {/* 8. Contacts Export */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                      8. Contacts Export:
                    </label>
                    <div className="custom-file-input-wrapper">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => setContactsFile(e.target.files[0] || null)}
                      />
                      <div className="custom-file-label" style={{ borderLeft: "3px solid var(--primary)" }}>
                        <i className="fa-solid fa-address-book"></i>{" "}
                        {contactsFile ? contactsFile.name : "Choose Contacts Export..."}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Identified Summary Status */}
          {(auditFiles.length > 0 || oppsFile || callsFile || newLeadsFile || bookedLeadsFile || apptLeadsFile || closedLeadsFile || contactsFile) && (
            <div
              style={{
                background: "var(--bg-color)",
                border: "1px solid var(--card-border)",
                borderRadius: "8px",
                padding: "1.2rem 1.5rem",
                fontSize: "0.82rem",
                marginBottom: "1.5rem",
              }}
            >
              <h4 style={{ fontWeight: 700, marginBottom: "0.6rem" }}>
                <i className="fa-solid fa-circle-info"></i> Mapped Bulk Files:
              </h4>
              <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.5rem", listStyle: "none", padding: 0 }}>
                <li>
                  GHL Agent Logs:{" "}
                  <strong style={{ color: auditFiles.length > 0 ? "var(--success)" : "var(--text-secondary)" }}>
                    {auditFiles.length > 0 ? `✓ ${auditFiles.length} files` : "Missing"}
                  </strong>
                </li>
                <li>
                  Opportunities Master:{" "}
                  <strong style={{ color: oppsFile ? "var(--success)" : "var(--text-secondary)" }}>
                    {oppsFile ? `✓ ${oppsFile.name}` : "Missing"}
                  </strong>
                </li>
                <li>
                  Call Report Log:{" "}
                  <strong style={{ color: callsFile ? "var(--success)" : "var(--text-secondary)" }}>
                    {callsFile ? `✓ ${callsFile.name}` : "Missing"}
                  </strong>
                </li>
                <li>
                  New Leads Segmentation:{" "}
                  <strong style={{ color: newLeadsFile ? "var(--success)" : "var(--text-secondary)" }}>
                    {newLeadsFile ? `✓ ${newLeadsFile.name}` : "Missing"}
                  </strong>
                </li>
                <li>
                  Booked Leads:{" "}
                  <strong style={{ color: bookedLeadsFile ? "var(--success)" : "var(--text-secondary)" }}>
                    {bookedLeadsFile ? `✓ ${bookedLeadsFile.name}` : "Missing"}
                  </strong>
                </li>
                <li>
                  Appt Booked Leads:{" "}
                  <strong style={{ color: apptLeadsFile ? "var(--success)" : "var(--text-secondary)" }}>
                    {apptLeadsFile ? `✓ ${apptLeadsFile.name}` : "Missing"}
                  </strong>
                </li>
                <li>
                  Closed Leads:{" "}
                  <strong style={{ color: closedLeadsFile ? "var(--success)" : "var(--text-secondary)" }}>
                    {closedLeadsFile ? `✓ ${closedLeadsFile.name}` : "Missing"}
                  </strong>
                </li>
                <li>
                  Contacts Export:{" "}
                  <strong style={{ color: contactsFile ? "var(--success)" : "var(--text-secondary)" }}>
                    {contactsFile ? `✓ ${contactsFile.name}` : "Missing"}
                  </strong>
                </li>
              </ul>
            </div>
          )}

          {/* Trigger options */}
          <div
            style={{
              display: "flex",
              gap: "1rem",
              alignItems: "center",
              flexWrap: "wrap",
              borderTop: "1px solid var(--card-border)",
              paddingTop: "1.5rem",
            }}
          >
            <button
              className="btn-primary-small"
              onClick={processUploadedFiles}
              disabled={auditFiles.length === 0}
              style={{
                opacity: auditFiles.length === 0 ? 0.5 : 1,
                cursor: auditFiles.length === 0 ? "not-allowed" : "pointer",
                padding: "0.65rem 2rem",
                fontSize: "0.9rem",
              }}
            >
              <i className="fa-solid fa-gears"></i> Process and Compile Workspace
            </button>

            {processStatus && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.95rem" }}>
                <i className="fa-solid fa-circle-notch fa-spin" style={{ color: "var(--primary)" }}></i>
                <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>{processStatus}</span>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Progress Loader Overlay */}
      {processingState && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(5px)",
            WebkitBackdropFilter: "blur(5px)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "550px",
              padding: "2rem",
              textAlign: "left",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
              display: "flex",
              flexDirection: "column",
              gap: "1.2rem",
              margin: "0 1rem"
            }}
          >
            <h3 style={{ margin: 0, fontSize: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Compiling Datasets...</span>
              <span style={{ color: "var(--primary)" }}>{processingState.progressPercent}%</span>
            </h3>

            {/* Progress Bar Container */}
            <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.1)", borderRadius: "4px", overflow: "hidden" }}>
              <div
                style={{
                  width: `${processingState.progressPercent}%`,
                  height: "100%",
                  background: "var(--primary)",
                  transition: "width 0.4s ease"
                }}
              />
            </div>

            {/* Step Summary Details */}
            {currentStepIdx !== -1 && (
              <div style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid var(--card-border)",
                borderRadius: "8px",
                padding: "1rem",
                fontSize: "0.88rem",
                color: "var(--text-primary)",
                lineHeight: "1.5",
                margin: "0.5rem 0"
              }}>
                <h4 style={{ margin: "0 0 0.5rem 0", fontWeight: 800, color: "var(--primary)", display: "flex", justifyItems: "center", gap: "0.4rem" }}>
                  <i className="fa-solid fa-square-poll-horizontal"></i> Step {currentStepIdx + 1} Result:
                </h4>
                <div style={{ whiteSpace: "pre-line", fontFamily: "monospace", fontSize: "0.82rem", background: "rgba(0,0,0,0.2)", padding: "0.8rem", borderRadius: "6px", overflowY: "auto", maxHeight: "150px" }}>
                  {stepDetails}
                </div>
                
                {stepStatus === "waiting-for-user" && (
                  <div style={{ display: "flex", gap: "0.8rem", marginTop: "1rem" }}>
                    <button
                      className="btn-primary-small"
                      onClick={handleNextStep}
                      style={{ padding: "0.5rem 1.25rem", fontSize: "0.82rem", cursor: "pointer" }}
                    >
                      Move to Next Step <i className="fa-solid fa-chevron-right" style={{ marginLeft: "0.3rem" }}></i>
                    </button>
                  </div>
                )}
                
                {stepStatus === "confirm-upload" && (
                  <div style={{ display: "flex", gap: "0.8rem", marginTop: "1rem" }}>
                    <button
                      className="btn-primary-small"
                      onClick={handleConfirmUpload}
                      style={{ padding: "0.5rem 1.25rem", fontSize: "0.82rem", cursor: "pointer" }}
                    >
                      <i className="fa-solid fa-cloud-arrow-up" style={{ marginRight: "0.3rem" }}></i> Yes, Upload to GitHub
                    </button>
                    <button
                      onClick={handleSkipUpload}
                      style={{
                        padding: "0.5rem 1.25rem",
                        borderRadius: "6px",
                        border: "1px solid var(--card-border)",
                        background: "rgba(255,255,255,0.05)",
                        color: "var(--text-primary)",
                        cursor: "pointer",
                        fontSize: "0.82rem"
                      }}
                    >
                      Skip Upload (Save Locally Only)
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Error Message */}
            {processingState.error && (
              <div style={{ padding: "0.8rem", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "var(--danger)", borderRadius: "6px", fontSize: "0.85rem", wordBreak: "break-all" }}>
                <strong>Error:</strong> {processingState.error}
                <button className="btn-primary-small" onClick={() => { setProcessingState(null); setCurrentStepIdx(-1); }} style={{ marginTop: "0.5rem", display: "block", backgroundColor: "var(--danger)", color: "white" }}>Close</button>
              </div>
            )}

            {/* Steps list */}
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {processingState.steps.map((step, idx) => (
                <li key={step.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.85rem", opacity: step.status === "pending" ? 0.4 : 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    {step.status === "pending" && <i className="fa-regular fa-circle" style={{ color: "var(--text-secondary)" }}></i>}
                    {step.status === "processing" && <i className="fa-solid fa-circle-notch fa-spin" style={{ color: "var(--primary)" }}></i>}
                    {step.status === "done" && <i className="fa-solid fa-circle-check" style={{ color: "var(--success)" }}></i>}
                    {step.status === "error" && <i className="fa-solid fa-circle-xmark" style={{ color: "var(--danger)" }}></i>}
                    <span>{step.name}</span>
                  </div>
                  <span style={{ fontSize: "0.78rem", textTransform: "uppercase", fontWeight: 700, color: step.status === "done" ? "var(--success)" : step.status === "processing" ? "var(--primary)" : "var(--text-secondary)" }}>
                    {step.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Custom Alert & Confirm Popup Modal */}
      {customPopup && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.65)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100000,
          animation: "popupFadeIn 0.2s ease-out"
        }}>
          <div className="card" style={{
            width: "min(420px, 90%)",
            padding: "2rem",
            borderRadius: "16px",
            border: "1px solid var(--card-border)",
            backgroundColor: "var(--card-bg)",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
            display: "flex",
            flexDirection: "column",
            gap: "1.2rem",
            animation: "popupSlideUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)"
          }}>
            {/* Header with Icon */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                backgroundColor: customPopup.type === "confirm" ? "rgba(224, 168, 0, 0.15)" : "rgba(34, 197, 94, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: customPopup.type === "confirm" ? "var(--warning)" : "var(--success)"
              }}>
                <i className={customPopup.type === "confirm" ? "fa-solid fa-circle-question fa-lg" : "fa-solid fa-circle-check fa-lg"}></i>
              </div>
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800 }}>
                {customPopup.type === "confirm" ? "Confirm Action" : "Success"}
              </h3>
            </div>

            {/* Message Body */}
            <p style={{
              margin: 0,
              fontSize: "0.92rem",
              lineHeight: 1.5,
              color: "var(--text-secondary)"
            }}>
              {customPopup.message}
            </p>

            {/* Buttons Group */}
            <div style={{ display: "flex", gap: "0.8rem", justifyContent: "flex-end", marginTop: "0.4rem" }}>
              {customPopup.type === "confirm" && (
                <button
                  onClick={customPopup.onCancel}
                  className="btn-secondary"
                  style={{
                    padding: "0.6rem 1.2rem",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    border: "1px solid var(--card-border)",
                    backgroundColor: "transparent",
                    color: "var(--text-primary)",
                    transition: "all 0.2s"
                  }}
                >
                  {customPopup.cancelLabel || "Cancel"}
                </button>
              )}
              <button
                onClick={customPopup.onConfirm}
                className="btn-primary"
                style={{
                  padding: "0.6rem 1.2rem",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  border: "none",
                  backgroundColor: "var(--primary)",
                  color: "#000",
                  transition: "all 0.2s"
                }}
              >
                {customPopup.type === "confirm" ? (customPopup.confirmLabel || "Overwrite") : "OK"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup Animations */}
      <style>{`
        @keyframes popupFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes popupSlideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
