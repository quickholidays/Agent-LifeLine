"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import Overview from "@/components/Overview";
import TeamTimeline from "@/components/TeamTimeline";
import ActivityAndMetrics from "@/components/ActivityAndMetrics";
import AgentTable from "@/components/AgentTable";
import AgentDetails from "@/components/AgentDetails";
import ProgressWorkspace from "@/components/ProgressWorkspace";
import ExecutiveReport from "@/components/ExecutiveReport";
import AgentCharts from "@/components/AgentCharts";
import ConversationsWorkspace from "@/components/ConversationsWorkspace";
import { parseCSV } from "@/utils/csvParser";
import { processAgentData } from "@/utils/analysisEngine";
import CustomDatePicker from "@/components/CustomDatePicker";
import Login from "@/components/Login";

const isNewLead = (lead, newLeadsList) => {
  if (!Array.isArray(newLeadsList) || newLeadsList.length === 0) return false;

  const leadPhone = (lead.phone || "").replace(/[^0-9+]/g, "").trim();
  const leadEmail = (lead.email || "").trim().toLowerCase();
  const leadName = (lead.name || "").trim().toLowerCase();

  return newLeadsList.some((nl) => {
    const nlPhone = (nl.phone || "").replace(/[^0-9+]/g, "").trim();
    const nlEmail = (nl.email || "").trim().toLowerCase();
    const nlName = (nl.name || nl.fullName || "").trim().toLowerCase();

    if (leadPhone && nlPhone && leadPhone === nlPhone) return true;
    if (leadEmail && nlEmail && leadEmail === nlEmail) return true;
    if (leadName && nlName && leadName === nlName) return true;

    return false;
  });
};

export default function Home() {
  const [agentsList, setAgentsList] = useState([]);
  const [rawAnalysisData, setRawAnalysisData] = useState({ bstCallsList: [], bstUpdatesList: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Layout Tab Switching: overview, activity-metrics, agent-progress, executive-report
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [theme, setTheme] = useState("dark");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showHero, setShowHero] = useState(true);

  // Caching & github available dates states
  const [availableDates, setAvailableDates] = useState([]);
  const [isCustomData, setIsCustomData] = useState(false);
  const [ghlToken, setGhlToken] = useState("");
  const [ghlLocationId, setGhlLocationId] = useState("");

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
  const [syncConversations, setSyncConversations] = useState(false);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMounted, setAuthMounted] = useState(false);
  const [userRole, setUserRole] = useState("admin");

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userRole");
    localStorage.removeItem("showHero");
    document.cookie = "userRole=; path=/; max-age=0; SameSite=Lax";
    setIsLoggedIn(false);
    setUserRole("admin");
    setShowHero(true);
  };

  useEffect(() => {
    setAuthMounted(true);
    setIsLoggedIn(localStorage.getItem("isLoggedIn") === "true");
    setUserRole(localStorage.getItem("userRole") || "admin");
    setShowHero(localStorage.getItem("showHero") !== "false");
    
    // Load and apply saved theme preference on mount
    const savedTheme = localStorage.getItem("theme") || "dark";
    setTheme(savedTheme);
    if (savedTheme === "light") {
      document.body.classList.add("light-mode");
      document.body.classList.remove("dark-mode");
    } else {
      document.body.classList.add("dark-mode");
      document.body.classList.remove("light-mode");
    }
  }, []);
  const [showGhlMessages, setShowGhlMessages] = useState(true);
  const [ghlOutboundMessages, setGhlOutboundMessages] = useState([]);
  const [breakThresholdMinutes, setBreakThresholdMinutes] = useState(30);

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

  const getLocalDateString = (dateStrOrObj, tz = "BST") => {
    if (!dateStrOrObj) return "";
    const date = new Date(dateStrOrObj);
    if (isNaN(date.getTime())) return "";
    const tzName = tz === "PKT" ? "Asia/Karachi" : "Europe/London";
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tzName,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    const parts = formatter.formatToParts(date);
    const year = parts.find(p => p.type === "year").value;
    const month = parts.find(p => p.type === "month").value;
    const day = parts.find(p => p.type === "day").value;
    return `${year}-${month}-${day}`;
  };

  // Live GHL API fetch helper
  const fetchGhlOutboundMessages = async (targetDate, token, locationId, tz = "BST") => {
    try {
      if (!token || !locationId) {
        throw new Error("Missing GHL API credentials");
      }

      // 1. Fetch Users
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

      // 2. Fetch Conversations
      const outboundMsgs = [];
      let currentStartAfterDate = null;
      let hasMore = true;
      let pageCount = 0;

      while (hasMore && pageCount < 5) {
        pageCount++;
        const params = {
          locationId,
          limit: 20,
          status: "all",
          sortBy: "last_message_date",
          sort: "desc"
        };
        if (currentStartAfterDate) {
          params.startAfterDate = currentStartAfterDate;
        }

        const convRes = await fetch("/api/ghl", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: "/conversations/search",
            token,
            params
          })
        });
        const convData = await convRes.json();
        if (convData.error) throw new Error(convData.error);
        if (!convData.conversations || convData.conversations.length === 0) {
          break;
        }

        for (const c of convData.conversations) {
          const lastMsgDate = c.lastMessageDate || c.dateUpdated || c.dateCreated;
          if (!lastMsgDate) continue;

          const dateStr = getLocalDateString(lastMsgDate, tz);
          if (dateStr === targetDate) {
            const assignedUserId = c.assignedTo;
            const mappedAgentName = userMap[assignedUserId] || "Unassigned";

            // Fetch messages
            const msgRes = await fetch("/api/ghl", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                endpoint: `/conversations/${c.id}/messages`,
                token,
                params: { limit: 50 }
              })
            });
            const msgData = await msgRes.json();
            const pageMsgs = (msgData.messages && msgData.messages.messages) || [];
            if (Array.isArray(pageMsgs)) {
              pageMsgs.forEach(m => {
                const mDate = getLocalDateString(m.dateAdded, tz);
                if (mDate === targetDate && m.direction === "outbound" && m.type !== "TYPE_CALL" && m.messageType !== "TYPE_CALL") {
                  outboundMsgs.push({
                    id: m.id,
                    agent: mappedAgentName,
                    time: new Date(m.dateAdded),
                    body: m.body || "[Media or Attachment]",
                    contactName: c.fullName || "GHL Contact",
                    type: "message"
                  });
                }
              });
            }
          }
        }

        // Pagination check
        const lastConv = convData.conversations[convData.conversations.length - 1];
        const lastConvDate = lastConv.lastMessageDate || lastConv.dateUpdated || lastConv.dateCreated;
        if (lastConvDate && getLocalDateString(lastConvDate, tz) >= targetDate) {
          currentStartAfterDate = lastConvDate;
        } else {
          hasMore = false;
        }
      }

      return outboundMsgs;
    } catch (error) {
      console.warn("GHL Live Sync failed, falling back to simulated data:", error);
      return getMockOutboundMessages(targetDate);
    }
  };

  const handleGhlTokenChange = (val) => {
    setGhlToken(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("ghl_token", val);
    }
  };

  const handleGhlLocationChange = (val) => {
    setGhlLocationId(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("ghl_location", val);
    }
  };

  // Fetch available dates in repo on mount
  useEffect(() => {
    // Load theme from local storage
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
      setGhlToken(localStorage.getItem("ghl_token") || "");
      setGhlLocationId(localStorage.getItem("ghl_location") || "");
    }

    // Auto collapse sidebar on small viewports
    if (typeof window !== "undefined") {
      if (window.innerWidth <= 1024) {
        setSidebarCollapsed(true);
      }
    }

    const fetchDates = async () => {
      try {
        const res = await fetch("/api/backup");
        if (res.ok) {
          const result = await res.json();
          setAvailableDates(result.dates || []);
        }
      } catch (err) {
        console.error("Failed to fetch available dates", err);
      }
    };
    fetchDates();
  }, []);

  // Sync date selection with URL query parameter on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const queryDate = urlParams.get("date");
      if (queryDate) {
        setReportDate(queryDate);
      }
    }
  }, []);
  // Load data when reportDate changes
  useEffect(() => {
    const loadDateData = async () => {
      setLoading(true);
      setError(null);

      // Load from GitHub or local fallback API for the selected date
      try {
        const checkRes = await fetch(`/api/backup?date=${reportDate}`);
        if (!checkRes.ok) {
          throw new Error(`Failed to check backup status (${checkRes.status})`);
        }
        const checkData = await checkRes.json();

        if (checkData.exists) {
          const data = checkData.data;
          console.log("Data received from backup API for date:", reportDate, data);

          // Normalize global logs and calls to guarantee real Date objects
          let normalizedRaw = { ...data };
          if (Array.isArray(normalizedRaw.bstCallsList)) {
            normalizedRaw.bstCallsList = normalizedRaw.bstCallsList.map(c => ({
              ...c,
              time: new Date(c.time || c.timestamp)
            }));
          } else if (Array.isArray(data.calls)) {
            normalizedRaw.bstCallsList = data.calls.map(c => ({
              agent: c.agent,
              time: new Date(c.timestamp),
              direction: c.direction,
              status: c.status,
              duration: c.duration
            }));
          }

          if (Array.isArray(normalizedRaw.bstUpdatesList)) {
            normalizedRaw.bstUpdatesList = normalizedRaw.bstUpdatesList.map(act => ({
              ...act,
              time: new Date(act.time || act.timestamp)
            }));
          } else if (Array.isArray(data.audit_logs)) {
            normalizedRaw.bstUpdatesList = data.audit_logs.map(act => ({
              agent: act.agent,
              time: new Date(act.timestamp),
              module: act.module,
              action: act.action,
              details: act.details || ""
            }));
          }

          const ghlMessages = normalizedRaw.ghl_outbound_messages || normalizedRaw.ghlMessages || [];
          let parsed = [];

          // Build index for calls and audit logs by agent name
          const callsByAgent = {};
          const auditByAgent = {};

          if (Array.isArray(data.calls)) {
            data.calls.forEach(c => {
              const agName = c.agent;
              if (agName) {
                if (!callsByAgent[agName]) callsByAgent[agName] = [];
                callsByAgent[agName].push({
                  timestamp: c.timestamp,
                  contact_name: c.contact_name || "Unknown",
                  duration: c.duration || "-",
                  status: c.status || "-",
                  direction: c.direction || "unknown"
                });
              }
            });
          }

          if (Array.isArray(data.audit_logs)) {
            data.audit_logs.forEach(act => {
              const agName = act.agent;
              if (agName) {
                if (!auditByAgent[agName]) auditByAgent[agName] = [];
                auditByAgent[agName].push({
                  timestamp: act.timestamp,
                  module: act.module,
                  action: act.action,
                  details: act.details || ""
                });
              }
            });
          }

          const agentsSource = data.agents || data;

          if (Array.isArray(agentsSource)) {
            parsed = agentsSource.map(stats => {
              const name = stats.name || stats.name_raw;
              const seg = stats.segmentations || {
                newLeads: 0,
                bookedLeads: 0,
                apptBookedLeads: 0,
                closedLeads: 0,
                newLeadsToday: 0,
                bookedLeadsToday: 0,
                apptBookedLeadsToday: 0,
              };
              const callMetrics = stats.call_metrics || {
                outboundCount: 0,
                outboundAttended: 0,
                outboundMissed: 0,
                outboundMinutes: 0,
                outboundAvgDuration: 0,
                inboundCount: 0,
                inboundAttended: 0,
                inboundMissed: 0,
                inboundMinutes: 0,
                inboundAvgDuration: 0,
              };

              const agentCalls = callsByAgent[name] || stats.calls || [];
              const agentActions = auditByAgent[name] || stats.actions_list || [];

              // Calculate unique engaged leads and conversions for local fallback compatibility
              const interactedLeads = new Set();
              const interactedConversions = new Set();
              agentActions.forEach(act => {
                let leadId = null;
                if (act.details) {
                  try {
                    const detailsObj = typeof act.details === "string" ? JSON.parse(act.details) : act.details;
                    leadId = detailsObj.contactId || detailsObj.opportunityId || detailsObj.id || detailsObj.contactName;
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
              agentCalls.forEach(c => {
                if (c.contact_name && c.contact_name !== "Unknown") {
                  interactedLeads.add(`name_${c.contact_name}`);
                }
              });

              // Add all messaged contacts to interactedLeads
              const agentMessages = ghlMessages.filter(
                (msg) => msg.agent && msg.agent.toLowerCase() === name.toLowerCase()
              );
              agentMessages.forEach((msg) => {
                if (msg.contactName) {
                  interactedLeads.add(msg.contactName.trim().toLowerCase());
                }
              });

              const interactedLeadsCount = interactedLeads.size;
              const generalConvRate = interactedLeadsCount > 0
                ? ((seg.bookedLeadsToday || 0) / interactedLeadsCount) * 100
                : 0.0;

              const bookedNewLeads = (stats.booked_leads_details || []).filter(l => isNewLead(l, stats.new_leads_details || []));
              const closedNewLeads = (stats.closed_leads_details || []).filter(l => isNewLead(l, stats.new_leads_details || []));
              const todayConversionLeads = [...bookedNewLeads, ...closedNewLeads];

              return {
                name,
                actions: stats.actions || stats.total_actions || agentActions.length || 0,
                opps: stats.opps || stats.assigned_opportunities || 0,
                span: stats.span || stats.workday_span || 0,
                active: stats.active || stats.active_duration || 0,
                breaks: stats.breaks ? (Array.isArray(stats.breaks) ? stats.breaks.length : stats.breaks) : 0,
                firstAction: stats.firstAction || stats.first_action ? new Date(stats.firstAction || stats.first_action) : null,
                lastAction: stats.lastAction || stats.last_action ? new Date(stats.lastAction || stats.last_action) : null,
                breakDuration: stats.breakDuration || stats.total_break_duration || 0,
                calls: agentCalls,
                actions_list: agentActions,
                details: stats,
                new_leads_details: stats.new_leads_details || [],
                margin_opportunities_details: stats.margin_opportunities_details || [],
                today_conversion_leads: todayConversionLeads,
                booked_leads_details: stats.booked_leads_details || [],
                closed_leads_details: stats.closed_leads_details || [],
                appt_booked_leads_details: stats.appt_booked_leads_details || [],

                segmentations: {
                  ...seg,
                  newLeads: stats.new_leads_details ? stats.new_leads_details.length : 0,
                  newLeadsToday: stats.new_leads_details ? stats.new_leads_details.length : 0,
                  referrals: seg.referrals || 0,
                  referralsToday: seg.referralsToday || 0,
                },
                margin_added_today: stats.margin_added_today || 0,
                stage_interested_today: stats.stage_interested_today || 0,
                stage_contacted_today: stats.stage_contacted_today || 0,
                notes_updated_today: stats.notes_updated_today || 0,
                tasks_added_today: stats.tasks_added_today || 0,
                interacted_leads_today: interactedLeadsCount,
                interacted_conversions_today: stats.interacted_conversions_today || interactedConversions.size || 0,
                general_conv_rate: generalConvRate,
                new_leads_today: stats.new_leads_details ? stats.new_leads_details.length : 0,
                referrals_today: stats.referrals_today || 0,
                converted_today: todayConversionLeads.length,
                today_conv_rate: (stats.new_leads_details ? stats.new_leads_details.length : 0) > 0
                  ? (todayConversionLeads.length / (stats.new_leads_details ? stats.new_leads_details.length : 0)) * 100
                  : 0.0,
                call_metrics: callMetrics,
              };
            }).sort((a, b) => b.actions - a.actions);
          } else {
            // Re-map object layout fallback if stored in older backup dictionary style
            parsed = Object.entries(agentsSource)
              .map(([name, stats]) => {
                const seg = stats.segmentations || {
                  newLeads: 0,
                  bookedLeads: 0,
                  apptBookedLeads: 0,
                  closedLeads: 0,
                  newLeadsToday: 0,
                  bookedLeadsToday: 0,
                  apptBookedLeadsToday: 0,
                };

                const callMetrics = stats.call_metrics || {
                  outboundCount: 0,
                  outboundAttended: 0,
                  outboundMissed: 0,
                  outboundMinutes: 0,
                  outboundAvgDuration: 0,
                  inboundCount: 0,
                  inboundAttended: 0,
                  inboundMissed: 0,
                  inboundMinutes: 0,
                  inboundAvgDuration: 0,
                };

                const auditList = stats.actions_list || [];
                const callsList = stats.calls || [];

                // Re-calculate unique engaged leads for the backup if not pre-calculated
                const interactedLeads = new Set();
                const interactedConversions = new Set();

                auditList.forEach((act) => {
                  try {
                    const d = typeof act.details === "string" ? JSON.parse(act.details) : act.details;
                    const cName = d.contactName || d.contactNameToday || d.contact_name || d.name;
                    if (cName) {
                      interactedLeads.add(cName);
                      if (d.pipelineStageName === "Booked" || d.pipelineStageName === "Appointment Booked" || d.status === "won") {
                        interactedConversions.add(cName);
                      }
                    }
                  } catch { }
                });

                callsList.forEach((c) => {
                  if (c.contact_name) interactedLeads.add(c.contact_name);
                });

                // Add all messaged contacts to interactedLeads
                const agentMessages = ghlMessages.filter(
                  (msg) => msg.agent && msg.agent.toLowerCase() === name.toLowerCase()
                );
                agentMessages.forEach((msg) => {
                  if (msg.contactName) {
                    interactedLeads.add(msg.contactName.trim().toLowerCase());
                  }
                });

                const interactedLeadsCount = interactedLeads.size;
                const generalConvRate = interactedLeadsCount > 0
                  ? ((seg.bookedLeadsToday || 0) / interactedLeadsCount) * 100
                  : 0.0;

                const bookedNewLeads = (stats.booked_leads_details || []).filter(l => isNewLead(l, stats.new_leads_details || []));
                const closedNewLeads = (stats.closed_leads_details || []).filter(l => isNewLead(l, stats.new_leads_details || []));
                const todayConversionLeads = [...bookedNewLeads, ...closedNewLeads];

                return {
                  name,
                  actions: stats.total_actions,
                  opps: stats.assigned_opportunities,
                  span: stats.workday_span,
                  active: stats.active_duration,
                  breaks: stats.breaks ? stats.breaks.length : 0,
                  firstAction: stats.first_action ? new Date(stats.first_action) : null,
                  lastAction: stats.last_action ? new Date(stats.last_action) : null,
                  breakDuration: stats.total_break_duration,
                  calls: callsList,
                  actions_list: auditList,
                  details: stats,
                  new_leads_details: stats.new_leads_details || [],
                  margin_opportunities_details: stats.margin_opportunities_details || [],
                  today_conversion_leads: todayConversionLeads,
                  booked_leads_details: stats.booked_leads_details || [],
                  closed_leads_details: stats.closed_leads_details || [],
                  appt_booked_leads_details: stats.appt_booked_leads_details || [],

                  segmentations: {
                    ...seg,
                    newLeads: stats.new_leads_details ? stats.new_leads_details.length : 0,
                    newLeadsToday: stats.new_leads_details ? stats.new_leads_details.length : 0,
                    referrals: seg.referrals || 0,
                    referralsToday: seg.referralsToday || 0,
                  },
                  margin_added_today: stats.margin_added_today || 0,
                  stage_interested_today: stats.stage_interested_today || 0,
                  stage_contacted_today: stats.stage_contacted_today || 0,
                  notes_updated_today: stats.notes_updated_today || 0,
                  tasks_added_today: stats.tasks_added_today || 0,
                  interacted_leads_today: interactedLeadsCount,
                  interacted_conversions_today: stats.interacted_conversions_today || interactedConversions.size || 0,
                  general_conv_rate: generalConvRate,
                  new_leads_today: stats.new_leads_details ? stats.new_leads_details.length : 0,
                  referrals_today: stats.referrals_today || 0,
                  converted_today: todayConversionLeads.length,
                  today_conv_rate: (stats.new_leads_details ? stats.new_leads_details.length : 0) > 0
                    ? (todayConversionLeads.length / (stats.new_leads_details ? stats.new_leads_details.length : 0)) * 100
                    : 0.0,
                  call_metrics: callMetrics,
                };
              })
              .sort((a, b) => b.actions - a.actions);
          }

          console.log("State updated. Parsed agentsList:", parsed);
          setAgentsList(parsed);
          setRawAnalysisData(normalizedRaw);
          setGhlOutboundMessages(normalizedRaw.ghl_outbound_messages || normalizedRaw.ghlMessages || []);
          setIsCustomData(true);
          setSelectedAgent(null);
        } else {
          setError(`No backup file found in GitHub repository for date: ${reportDate}`);
          setAgentsList([]);
          setRawAnalysisData({ bstCallsList: [], bstUpdatesList: [] });
          setIsCustomData(false);
        }
      } catch (err) {
        console.error(err);
        setError(`Failed to check or load backup: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadDateData();
  }, [reportDate]);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", nextTheme);
    }
    if (nextTheme === "light") {
      document.body.classList.add("light-mode");
      document.body.classList.remove("dark-mode");
    } else {
      document.body.classList.add("dark-mode");
      document.body.classList.remove("light-mode");
    }
  };

  const filteredAgents = agentsList.filter((agent) =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderSkeletonScreen = () => {
    if (activeTab === "overview") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Overview Cards Grid Skeleton */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem" }}>
            <div className="card skeleton-shimmer skeleton-card" style={{ height: "140px" }} />
            <div className="card skeleton-shimmer skeleton-card" style={{ height: "140px" }} />
            <div className="card skeleton-shimmer skeleton-card" style={{ height: "140px" }} />
            <div className="card skeleton-shimmer skeleton-card" style={{ height: "140px" }} />
          </div>
          {/* Chart & Sidebar Skeleton */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem" }}>
            <div className="card" style={{ padding: "1.5rem" }}>
              <div className="skeleton-shimmer skeleton-title" style={{ width: "35%", height: "24px" }} />
              <div className="skeleton-shimmer skeleton-chart" style={{ height: "300px", marginTop: "1rem" }} />
            </div>
            <div className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="skeleton-shimmer skeleton-title" style={{ width: "60%", height: "24px" }} />
              <div className="skeleton-shimmer skeleton-text" style={{ height: "60px" }} />
              <div className="skeleton-shimmer skeleton-text" style={{ height: "60px" }} />
              <div className="skeleton-shimmer skeleton-text" style={{ height: "60px" }} />
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === "activity-metrics") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Filters Card */}
          <div className="card skeleton-shimmer" style={{ height: "70px" }} />
          {/* 19 Metrics Cards Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.25rem" }}>
            {Array.from({ length: 19 }).map((_, i) => (
              <div key={i} className="card skeleton-shimmer skeleton-card" style={{ height: "140px" }} />
            ))}
          </div>
          {/* Table */}
          <div className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="skeleton-shimmer skeleton-title" style={{ width: "30%", height: "24px" }} />
            <div className="skeleton-shimmer skeleton-table-row" style={{ height: "45px" }} />
            <div className="skeleton-shimmer skeleton-table-row" style={{ height: "45px" }} />
            <div className="skeleton-shimmer skeleton-table-row" style={{ height: "45px" }} />
          </div>
        </div>
      );
    }

    // Default general-purpose tab layout skeleton
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div className="card skeleton-shimmer skeleton-title" style={{ width: "40%", height: "35px" }} />
        <div className="card skeleton-shimmer skeleton-chart" style={{ height: "320px" }} />
        <div className="card skeleton-shimmer skeleton-table-row" style={{ height: "50px" }} />
        <div className="card skeleton-shimmer skeleton-table-row" style={{ height: "50px" }} />
      </div>
    );
  };

  const renderActiveTab = () => {
    if (loading) {
      return renderSkeletonScreen();
    }

    switch (activeTab) {
      case "overview":
        return <Overview agents={agentsList} stageChanges={rawAnalysisData.stageChangesToday} reportDate={reportDate} />;
      case "activity-metrics":
        return <ActivityAndMetrics agents={agentsList} rawAnalysisData={rawAnalysisData} reportDate={reportDate} theme={theme} />;
      case "agent-progress":
        return <ProgressWorkspace agents={agentsList} />;
      case "agent-charts":
        return <AgentCharts agents={agentsList} />;
      case "ghl-conversations":
        return <ConversationsWorkspace agents={agentsList} defaultDate={reportDate} />;
      case "exec-conversion":
      case "exec-sprints":
      case "exec-calls":
      case "exec-timeline":
      case "exec-export":
        return (
          <ExecutiveReport
            agents={agentsList}
            bstCallsList={rawAnalysisData.bstCallsList}
            bstUpdatesList={rawAnalysisData.bstUpdatesList}
            activeSection={activeTab}
            reportDate={reportDate}
            ghlMessages={ghlOutboundMessages}
            timezone={timezone}
          />
        );
      default:
        return <Overview agents={agentsList} stageChanges={rawAnalysisData.stageChangesToday} reportDate={reportDate} timezone={timezone} />;
    }
  };

  // ── Hero Landing Page ─────────────────────────────────────────────────────
  if (!authMounted) return null;
  if (!isLoggedIn) {
    return <Login onSuccess={(role) => {
      setIsLoggedIn(true);
      setUserRole(role);
    }} />;
  }

  // Loading runs in background while hero shows — no blocking loading screen
  if (showHero) {
    return (
      <div className="hero-root hero-dark">

        {/* Video background — poster is actual first frame of the video */}
        <div className="hero-video-wrap">
          <img src="/hero-poster.jpg" alt="" className="hero-poster" aria-hidden="true" />
          <video
            className="hero-video"
            src="/bg-video.mp4"
            poster="/hero-poster.jpg"
            autoPlay
            muted
            loop
            playsInline
            preload="none"
          />
          <div className="hero-video-overlay" />
        </div>

        {/* Centred content */}
        <div className="hero-content">
          {/* Logo */}
          <img
            src="/logo.png"
            alt="LifeLine Logo"
            style={{
              height: "120px",
              width: "auto",
              marginBottom: "0.5rem",
              filter: "drop-shadow(0 8px 24px rgba(209, 92, 46, 0.25))"
            }}
          />

          <h1 className="hero-headline">
            LifeLine
            <span className="hero-headline-accent"> Agent Tracking</span>
          </h1>

          <p className="hero-subheadline">
            The premium GoHighLevel activity workspace. Know exactly what your agents are doing — every action, every call, every moment of the working day.
          </p>

          <button
            id="hero-enter-btn"
            className="hero-cta-btn"
            onClick={() => {
              localStorage.setItem("showHero", "false");
              setShowHero(false);
            }}
          >
            <span>{loading ? "Preparing Workspace…" : "Enter Workspace"}</span>
            <i className={`fa-solid ${loading ? "fa-spinner fa-spin" : "fa-arrow-right hero-cta-icon"}`} />
          </button>
        </div>
      </div>
    );
  }



  return (
    <div className="app-layout">
      {/* Mobile Sidebar Backdrop Overlay */}
      {!sidebarCollapsed && (
        <div
          className="mobile-sidebar-backdrop"
          onClick={() => setSidebarCollapsed(true)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 1050
          }}
        />
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (typeof window !== "undefined" && window.innerWidth <= 1024) {
            setSidebarCollapsed(true);
          }
        }}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        reportDate={reportDate}
        onDateChange={setReportDate}
        availableDates={availableDates}
      />

      {/* Main Content Area */}
      <main className="main-content-area">
        <header>
          <div className="logo-area" style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="mobile-hamburger"
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-primary)",
                width: "2.3rem",
                height: "2.3rem",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: "1.2rem",
                boxShadow: "none",
                flexShrink: 0
              }}
            >
              <i className="fa-solid fa-bars"></i>
            </button>
            <h2 style={{ margin: 0, textTransform: "capitalize" }}>
              {activeTab.replace("-", " ")} Workspace
            </h2>
          </div>
          <div className="header-controls">
            {userRole === "special" && (
              <Link
                href="/upload-data"
                className="btn-primary-small"
                style={{
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  padding: "0.55rem 1.1rem",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  borderRadius: "30px",
                  border: "1px solid var(--card-border)",
                  background: "var(--card-bg)",
                  color: "var(--text-primary)",
                  boxShadow: "var(--shadow)",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--primary)"}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--card-border)"}
              >
                <i className="fa-solid fa-cloud-arrow-up"></i>
                <span>Onboarding Portal</span>
              </Link>
            )}

            <div style={{ width: "160px" }}>
              <CustomDatePicker value={reportDate} onChange={setReportDate} />
            </div>

            <button
              id="theme-toggle"
              className="btn-theme"
              title="Toggle Light/Dark Mode"
              onClick={toggleTheme}
            >
              <i className={`fa-solid ${theme === "dark" ? "fa-moon" : "fa-sun"}`}></i>
            </button>

            <button
              className="btn-theme"
              title="Logout"
              onClick={handleLogout}
              style={{
                marginLeft: "0.5rem",
                color: "#e26939"
              }}
            >
              <i className="fa-solid fa-right-from-bracket"></i>
            </button>
          </div>
        </header>

        {/* Tab content panel */}
        {error ? (
          <div className="tab-content" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <section className="card" style={{ padding: "4rem 2rem", textAlign: "center", display: "flex", flexDirection: "column", gap: "1.25rem", alignItems: "center" }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: "3.5rem", color: "var(--primary)" }}></i>
              <h3 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800 }}>Daily Backup Not Found</h3>
              <p style={{ color: "var(--text-secondary)", maxWidth: "500px", margin: "0 auto", fontSize: "0.92rem", lineHeight: "1.5" }}>
                No database backup has been uploaded for <strong>{reportDate}</strong>. Go to the Onboarding Portal to upload daily CRM logs and save them to GitHub.
              </p>
               {userRole === "special" ? (
                <Link href="/upload-data" className="btn-primary-small" style={{ textDecoration: "none", marginTop: "0.5rem", padding: "0.65rem 1.8rem" }}>
                  <i className="fa-solid fa-cloud-arrow-up"></i> Go to Onboarding Portal
                </Link>
              ) : (
                <span style={{ color: "var(--text-secondary)", fontSize: "0.88rem", background: "rgba(255,255,255,0.03)", padding: "0.5rem 1rem", borderRadius: "8px", border: "1px solid var(--card-border)" }}>
                  <i className="fa-solid fa-lock" style={{ marginRight: "0.4rem" }}></i> Backups are read-only. Contact a Special User to upload today's logs.
                </span>
              )}
            </section>
          </div>
        ) : (
          renderActiveTab()
        )}
      </main>
    </div>
  );
}
