"use client";

import React, { useState, useEffect } from "react";
import TeamTimeline from "./TeamTimeline";
import {
  calculateNewLeads,
  calculateMarginGenerated,
  calculateBookedLeads,
  calculateClosedLeads,
  calculateApptBooked,
  calculateInteractedLeads,
  calculateTotalConversations,
  calculateCallsPlaced,
  calculateMissedCalls,
  calculateNotes,
  calculateTasks,
  calculateInterestedStage,
  calculateContactedStage,
  calculateReferrals,
  calculateGeneralConversion,
  calculateBookedLeadRate,
  calculateClosedLeadRate,
  calculateTotalActions
} from "../utils/metrics";

export default function ActivityAndMetrics({ agents, rawAnalysisData, reportDate, theme = "dark" }) {
  // Enforce specific agent selection by defaulting to the first agent name
  const [selectedAgentName, setSelectedAgentName] = useState("");
  const [activeCard, setActiveCard] = useState("newLeads");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Sync state with agents loading
  useEffect(() => {
    if (agents && agents.length > 0 && !selectedAgentName) {
      setSelectedAgentName("All Agents");
    }
  }, [agents, selectedAgentName]);

  // Get active agent configuration
  let selectedAgent = null;

  if (selectedAgentName === "All Agents") {
    const aggregated = {
      name: "All Agents",
      actions: 0,
      opps: 0,
      span: 0,
      active: 0,
      breaks: 0,
      breakDuration: 0,
      firstAction: null,
      lastAction: null,
      calls: [],
      actions_list: [],
      new_leads_details: [],
      margin_opportunities_details: [],
      today_conversion_leads: [],
      booked_leads_details: [],
      closed_leads_details: [],
      appt_booked_leads_details: [],
      segmentations: {
        newLeads: 0,
        bookedLeads: 0,
        apptBookedLeads: 0,
        closedLeads: 0,
        newLeadsToday: 0,
        bookedLeadsToday: 0,
        apptBookedLeadsToday: 0,
        closedLeadsToday: 0,
        referrals: 0,
        referralsToday: 0
      },
      call_metrics: {
        outboundCount: 0,
        outboundAttended: 0,
        outboundMissed: 0,
        outboundMinutes: 0,
        outboundAvgDuration: 0,
        inboundCount: 0,
        inboundAttended: 0,
        inboundMissed: 0,
        inboundMinutes: 0,
        inboundAvgDuration: 0
      },
      margin_added_today: 0,
      stage_interested_today: 0,
      stage_contacted_today: 0,
      notes_updated_today: 0,
      tasks_added_today: 0,
      interacted_leads_today: 0,
      interacted_conversions_today: 0,
      general_conv_rate: 0,
      today_conv_rate: 0,
      converted_today: 0
    };

    let totalSpan = 0;
    let agentsWithSpan = 0;
    let firstActionTime = null;
    let lastActionTime = null;

    agents.forEach((a) => {
      aggregated.actions += (a.actions || 0);
      aggregated.opps += (a.opps || 0);
      aggregated.active += (a.active || 0);
      aggregated.breaks += (a.breaks || 0);
      aggregated.breakDuration += (a.breakDuration || 0);

      if (a.span > 0) {
        totalSpan += a.span;
        agentsWithSpan++;
      }

      if (a.firstAction) {
        const d = new Date(a.firstAction);
        if (!firstActionTime || d < firstActionTime) firstActionTime = d;
      }
      if (a.lastAction) {
        const d = new Date(a.lastAction);
        if (!lastActionTime || d > lastActionTime) lastActionTime = d;
      }

      if (Array.isArray(a.calls)) aggregated.calls = aggregated.calls.concat(a.calls);
      if (Array.isArray(a.actions_list)) aggregated.actions_list = aggregated.actions_list.concat(a.actions_list);
      if (Array.isArray(a.new_leads_details)) aggregated.new_leads_details = aggregated.new_leads_details.concat(a.new_leads_details);
      if (Array.isArray(a.margin_opportunities_details)) aggregated.margin_opportunities_details = aggregated.margin_opportunities_details.concat(a.margin_opportunities_details);
      if (Array.isArray(a.today_conversion_leads)) aggregated.today_conversion_leads = aggregated.today_conversion_leads.concat(a.today_conversion_leads);
      if (Array.isArray(a.booked_leads_details)) aggregated.booked_leads_details = aggregated.booked_leads_details.concat(a.booked_leads_details);
      if (Array.isArray(a.closed_leads_details)) aggregated.closed_leads_details = aggregated.closed_leads_details.concat(a.closed_leads_details);
      if (Array.isArray(a.appt_booked_leads_details)) aggregated.appt_booked_leads_details = aggregated.appt_booked_leads_details.concat(a.appt_booked_leads_details);

      const s = a.segmentations || {};
      aggregated.segmentations.newLeads += (s.newLeads || 0);
      aggregated.segmentations.bookedLeads += (s.bookedLeads || 0);
      aggregated.segmentations.apptBookedLeads += (s.apptBookedLeads || 0);
      aggregated.segmentations.closedLeads += (s.closedLeads || 0);
      aggregated.segmentations.newLeadsToday += (s.newLeadsToday || 0);
      aggregated.segmentations.bookedLeadsToday += (s.bookedLeadsToday || 0);
      aggregated.segmentations.apptBookedLeadsToday += (s.apptBookedLeadsToday || 0);
      aggregated.segmentations.closedLeadsToday += (s.closedLeadsToday || 0);
      aggregated.segmentations.referrals += (s.referrals || 0);
      aggregated.segmentations.referralsToday += (s.referralsToday || 0);

      const c = a.call_metrics || {};
      aggregated.call_metrics.outboundCount += (c.outboundCount || 0);
      aggregated.call_metrics.outboundAttended += (c.outboundAttended || 0);
      aggregated.call_metrics.outboundMissed += (c.outboundMissed || 0);
      aggregated.call_metrics.outboundMinutes += (c.outboundMinutes || 0);
      aggregated.call_metrics.inboundCount += (c.inboundCount || 0);
      aggregated.call_metrics.inboundAttended += (c.inboundAttended || 0);
      aggregated.call_metrics.inboundMissed += (c.inboundMissed || 0);
      aggregated.call_metrics.inboundMinutes += (c.inboundMinutes || 0);

      aggregated.margin_added_today += (a.margin_added_today || 0);
      aggregated.stage_interested_today += (a.stage_interested_today || 0);
      aggregated.stage_contacted_today += (a.stage_contacted_today || 0);
      aggregated.notes_updated_today += (a.notes_updated_today || 0);
      aggregated.tasks_added_today += (a.tasks_added_today || 0);
      aggregated.interacted_leads_today += (a.interacted_leads_today || 0);
      aggregated.interacted_conversions_today += (a.interacted_conversions_today || 0);
      aggregated.converted_today += (a.converted_today || 0);
    });

    aggregated.span = agentsWithSpan > 0 ? totalSpan / agentsWithSpan : 0;
    aggregated.firstAction = firstActionTime;
    aggregated.lastAction = lastActionTime;

    if (aggregated.call_metrics.outboundAttended > 0) {
      aggregated.call_metrics.outboundAvgDuration = aggregated.call_metrics.outboundMinutes / aggregated.call_metrics.outboundAttended;
    }
    if (aggregated.call_metrics.inboundAttended > 0) {
      aggregated.call_metrics.inboundAvgDuration = aggregated.call_metrics.inboundMinutes / aggregated.call_metrics.inboundAttended;
    }

    aggregated.general_conv_rate = aggregated.interacted_leads_today > 0 ? (aggregated.segmentations.bookedLeadsToday / aggregated.interacted_leads_today) * 100 : 0;
    aggregated.today_conv_rate = aggregated.segmentations.newLeadsToday > 0 ? (aggregated.converted_today / aggregated.segmentations.newLeadsToday) * 100 : 0;

    selectedAgent = aggregated;
  } else {
    selectedAgent = agents.find((a) => a.name === selectedAgentName) || agents[0];
  }

  if (!selectedAgent) {
    return (
      <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
        <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: "2rem", color: "var(--primary)" }}></i>
        <p style={{ marginTop: "1rem", color: "var(--text-secondary)" }}>Loading agents dataset...</p>
      </div>
    );
  }

  // Helper values for selected agent
  const seg = selectedAgent.segmentations || {};
  const callM = selectedAgent.call_metrics || {};

  const totalCalls = (callM.outboundCount || 0) + (callM.inboundCount || 0);
  const missedInbound = callM.inboundMissed || 0;
  const todayConverted = selectedAgent.converted_today || 0;

  // Calculate conversations from GHL outbound messages in the backup
  const allMessages = rawAnalysisData.ghl_outbound_messages || rawAnalysisData.ghlMessages || [];
  const agentMessages = allMessages.filter(
    (msg) => msg.agent && msg.agent.toLowerCase() === selectedAgentName.toLowerCase()
  );
  const uniqueContactsMessaged = new Set(agentMessages.map((m) => m.contactName));
  const totalConversations = uniqueContactsMessaged.size;

  // Formatting rates using modular metric functions
  const metricValues = {
    newLeads: calculateNewLeads(selectedAgent),
    margin: `£${calculateMarginGenerated(selectedAgent).toLocaleString()}`,
    booked: calculateBookedLeads(selectedAgent),
    closed: calculateClosedLeads(selectedAgent),
    apptBooked: calculateApptBooked(selectedAgent),
    interactedLeads: calculateInteractedLeads(selectedAgent),
    totalConversations: calculateTotalConversations(selectedAgentName, rawAnalysisData),
    callsPlaced: calculateCallsPlaced(selectedAgent),
    missedCalls: calculateMissedCalls(selectedAgent),
    notes: calculateNotes(selectedAgent),
    tasks: calculateTasks(selectedAgent),
    interested: calculateInterestedStage(selectedAgent),
    contacted: calculateContactedStage(selectedAgent),
    referrals: calculateReferrals(selectedAgent),
    generalRate: calculateGeneralConversion(selectedAgent),
    bookedRate: calculateBookedLeadRate(selectedAgent),
    closedRate: calculateClosedLeadRate(selectedAgent),
    totalActions: calculateTotalActions(selectedAgent)
  };

  // Cards definitions: key, title, value, unit/sub, tooltip description
  const cards = [
    {
      key: "newLeads",
      title: "Today's New Leads",
      value: metricValues.newLeads,
      sub: "Active lead intake",
      tooltip: "Total new leads assigned to the agent in GoHighLevel today.",
    },
    {
      key: "margin",
      title: "Margin Generated",
      value: metricValues.margin,
      sub: "Won opportunities value",
      tooltip: "Sum of margins (in GBP) added to opportunities won today.",
    },
    {
      key: "booked",
      title: "Booked Leads",
      value: metricValues.booked,
      sub: "Standard conversions",
      tooltip: "Total number of leads successfully converted to a Booked status today.",
    },
    {
      key: "closed",
      title: "Closed Leads",
      value: metricValues.closed,
      sub: "Archived conversions",
      tooltip: "Total number of leads successfully closed/won today.",
    },
    {
      key: "apptBooked",
      title: "Appointment Booked",
      value: metricValues.apptBooked,
      sub: "Meeting slots secured",
      tooltip: "Total number of appointments successfully scheduled for leads today.",
    },
    {
      key: "interactedLeads",
      title: "Today Interacted Leads",
      value: metricValues.interactedLeads,
      sub: "Engaged contact profiles",
      tooltip: "Total unique leads (contacts or opportunities) whom the agent interacted with or updated today.",
    },
    {
      key: "totalConversations",
      title: "Total Conversations",
      value: metricValues.totalConversations,
      sub: `${agentMessages.length} Outbound Msgs`,
      tooltip: "Unique contact profiles the agent exchanged GHL text messages with today.",
    },
    {
      key: "callsPlaced",
      title: "Total Calls Placed",
      value: metricValues.callsPlaced,
      sub: "Voice conversations",
      tooltip: "Sum of inbound and outbound voice calls handled by the agent today.",
    },
    {
      key: "missedCalls",
      title: "Missed Inbound Calls",
      value: metricValues.missedCalls,
      sub: "Unattended voice leads",
      tooltip: "Total inbound calls that were missed or unanswered today.",
    },
    {
      key: "notes",
      title: "Notes Added",
      value: metricValues.notes,
      sub: "Notes logged",
      tooltip: "Total number of CRM text notes added to contact profiles today.",
    },
    {
      key: "tasks",
      title: "Tasks Added",
      value: metricValues.tasks,
      sub: "Action task assignments",
      tooltip: "Total follow-up tasks created or scheduled in GHL today.",
    },
    {
      key: "interested",
      title: "Interested Stage",
      value: metricValues.interested,
      sub: "Interested pipeline hits",
      tooltip: "Leads updated or moved into the pipeline's 'Interested' stage today.",
    },
    {
      key: "contacted",
      title: "Contacted Stage",
      value: metricValues.contacted,
      sub: "Contacted pipeline hits",
      tooltip: "Leads updated or moved into the pipeline's 'Contacted' stage today.",
    },
    {
      key: "referrals",
      title: "Today's Referrals",
      value: metricValues.referrals,
      sub: "Referral counts",
      tooltip: "Total number of referral leads recorded today.",
    },
    {
      key: "generalRate",
      title: "General Conversion",
      value: metricValues.generalRate,
      sub: "All-time efficiency",
      tooltip: "Lifetime lead conversion percentage (Booked Leads divided by eligible lead base).",
    },
    {
      key: "bookedRate",
      title: "Booked Lead Rate (%)",
      value: metricValues.bookedRate,
      sub: "Booked / New Leads",
      tooltip: "Percentage of new leads that got booked today.",
    },
    {
      key: "closedRate",
      title: "Closed Lead Rate (%)",
      value: metricValues.closedRate,
      sub: "Closed / New Leads",
      tooltip: "Percentage of new leads that got closed today.",
    },
    {
      key: "totalActions",
      title: "Total Actions",
      value: metricValues.totalActions,
      sub: "Agent activity index",
      tooltip: "Total activity count (CRM edits, calls, status changes, tasks) recorded today.",
    },
  ];

  // Helper function to format BST ISO strings
  const formatTime = (isoStr) => {
    if (!isoStr) return "-";
    const d = new Date(isoStr);
    return (
      d.getUTCHours().toString().padStart(2, "0") +
      ":" +
      d.getUTCMinutes().toString().padStart(2, "0") +
      " BST"
    );
  };

  // Helper function to parse JSON audit log details into contact names and clean text
  const parseActionDetails = (act) => {
    let contactName = "-";
    let cleanDetails = "";
    let actionStr = act.action || "Updated";

    if (!act.details) {
      return { contactName, cleanDetails, actionStr };
    }

    try {
      const d = typeof act.details === "string" ? JSON.parse(act.details) : act.details;

      // 1. NOTES
      if (act.module === "NOTE") {
        if (d.body) {
          cleanDetails = d.body.replace(/<\/?[^>]+(>|$)/g, "").replace(/&nbsp;/g, " ").trim();
        } else {
          cleanDetails = typeof act.details === "string" ? act.details : "Note updated";
        }
        contactName = d.contactName || d.contact_name || "-";
        if (contactName === "-" && Array.isArray(d.relations)) {
          const cRel = d.relations.find(r => r.objectKey === "contact");
          if (cRel) contactName = cRel.recordId || "-";
        }
      }

      // 2. OPPORTUNITY
      else if (act.module === "OPPORTUNITY") {
        contactName = d.contactName || d.contactNameToday || d.contact_name || d.name || "-";
        const stage = d.pipelineStageName || d.stageName || "";
        const status = d.status || "";
        const amount = d.amount || d.value || "";

        const parts = [];
        if (stage) parts.push(`Stage: ${stage}`);
        if (status) parts.push(`Status: ${status}`);
        if (amount) parts.push(`Margin: £${amount}`);
        
        cleanDetails = parts.join(" | ") || "Opportunity details modified";
        if (stage) actionStr = `Stage -> ${stage}`;
      }

      // 3. CONTACT
      else if (act.module === "CONTACT") {
        const fName = d.firstName || "";
        const lName = d.lastName || "";
        contactName = d.contactName || [fName, lName].filter(Boolean).join(" ") || "-";
        
        const parts = [];
        if (d.phone) parts.push(`Phone: ${d.phone}`);
        if (d.email) parts.push(`Email: ${d.email}`);
        cleanDetails = parts.join(" | ") || "Contact details updated";
      }

      // 4. TASK
      else if (act.module === "TASK") {
        cleanDetails = d.title || d.description || (typeof act.details === "string" ? act.details : "Task details updated");
        contactName = d.contactName || d.contact_name || "-";
      }
      
      // FALLBACK
      else {
        contactName = d.contactName || d.contact_name || "-";
        cleanDetails = typeof act.details === "string" ? act.details : "Details updated";
      }

    } catch (e) {
      const detailsStr = String(act.details);
      if (detailsStr.startsWith("{")) {
        const mName = detailsStr.match(/"contactName"\s*:\s*"([^"]+)"/) || detailsStr.match(/"name"\s*:\s*"([^"]+)"/);
        if (mName) contactName = mName[1];
        
        const mStage = detailsStr.match(/"pipelineStageName"\s*:\s*"([^"]+)"/);
        if (mStage) cleanDetails = `Stage: ${mStage[1]}`;
      } else {
        cleanDetails = detailsStr;
      }
    }

    return { contactName, cleanDetails, actionStr };
  };

  // Helper function to extract, filter, and format details records based on active card click
  const getRecords = () => {
    const actions = selectedAgent.actions_list || [];
    const callsList = selectedAgent.calls || [];
    const allMessages = rawAnalysisData.ghl_outbound_messages || rawAnalysisData.ghlMessages || [];
    const agentMessages = allMessages.filter(
      (msg) => msg.agent && msg.agent.toLowerCase() === selectedAgentName.toLowerCase()
    );

    switch (activeCard) {
      case "newLeads":
        if (Array.isArray(selectedAgent.new_leads_details) && selectedAgent.new_leads_details.length > 0) {
          return selectedAgent.new_leads_details.map((lead) => ({
            time: lead.created ? formatTime(lead.created) : "00:00 BST",
            agent: selectedAgentName,
            contact: lead.name,
            category: "New Contact Profile",
            action: lead.source ? `Source: ${lead.source}` : "CSV Upload",
            details: `Email: ${lead.email || "-"} | Phone: ${lead.phone || "-"} | Tags: ${lead.tags || "-"}`
          }));
        }
        return actions
          .filter((act) => act.module === "CONTACT")
          .map((act) => {
            const { contactName, cleanDetails, actionStr } = parseActionDetails(act);
            return {
              time: formatTime(act.timestamp),
              agent: selectedAgentName,
              contact: contactName,
              category: "New Contact",
              action: actionStr,
              details: cleanDetails || "New lead profile created"
            };
          });
      case "margin":
        if (Array.isArray(selectedAgent.margin_opportunities_details) && selectedAgent.margin_opportunities_details.length > 0) {
          return selectedAgent.margin_opportunities_details.map((opp) => ({
            time: opp.date ? formatTime(opp.date) : "00:00 BST",
            agent: opp.agent || selectedAgentName,
            contact: opp.name,
            category: "Margin Opportunity",
            action: `Margin: £${opp.margin.toFixed(2)}`,
            details: `Stage: ${opp.stage || "-"} | Status: ${opp.status || "-"} | Source: ${opp.source || "-"} | Email: ${opp.email || "-"} | Phone: ${opp.phone || "-"}`
          }));
        }
        return actions
          .filter((act) => act.module === "OPPORTUNITY" && act.details && (act.details.includes("margin") || act.details.includes("value") || act.details.includes("amount") || act.details.includes("Amount")))
          .map((act) => {
            const { contactName, cleanDetails, actionStr } = parseActionDetails(act);
            return {
              time: formatTime(act.timestamp),
              agent: selectedAgentName,
              contact: contactName,
              category: "Margin Generated",
              action: actionStr,
              details: cleanDetails
            };
          });
      case "booked":
        if (Array.isArray(selectedAgent.booked_leads_details) && selectedAgent.booked_leads_details.length > 0) {
          return selectedAgent.booked_leads_details.map((lead) => ({
            time: lead.date ? formatTime(lead.date) : "00:00 BST",
            agent: lead.agent || selectedAgentName,
            contact: lead.name,
            category: "Booked Lead",
            action: lead.stage || "Stage: Booked",
            details: `Email: ${lead.email || "-"} | Phone: ${lead.phone || "-"}`
          }));
        }
        return actions
          .filter((act) => act.module === "OPPORTUNITY" && act.details && act.details.includes('"pipelineStageName":"Booked"'))
          .map((act) => {
            const { contactName, cleanDetails, actionStr } = parseActionDetails(act);
            return {
              time: formatTime(act.timestamp),
              agent: selectedAgentName,
              contact: contactName,
              category: "Lead Booked",
              action: actionStr,
              details: cleanDetails
            };
          });
      case "closed":
        if (Array.isArray(selectedAgent.closed_leads_details) && selectedAgent.closed_leads_details.length > 0) {
          return selectedAgent.closed_leads_details.map((lead) => ({
            time: lead.date ? formatTime(lead.date) : "00:00 BST",
            agent: lead.agent || selectedAgentName,
            contact: lead.name,
            category: "Closed Won Lead",
            action: lead.stage || "Stage: Closed Won",
            details: `Email: ${lead.email || "-"} | Phone: ${lead.phone || "-"}`
          }));
        }
        return actions
          .filter((act) => act.module === "OPPORTUNITY" && act.details && act.details.includes('"status":"won"'))
          .map((act) => {
            const { contactName, cleanDetails, actionStr } = parseActionDetails(act);
            return {
              time: formatTime(act.timestamp),
              agent: selectedAgentName,
              contact: contactName,
              category: "Lead Closed Won",
              action: actionStr,
              details: cleanDetails
            };
          });
      case "apptBooked":
        if (Array.isArray(selectedAgent.appt_booked_leads_details) && selectedAgent.appt_booked_leads_details.length > 0) {
          return selectedAgent.appt_booked_leads_details.map((lead) => ({
            time: lead.date ? formatTime(lead.date) : "00:00 BST",
            agent: lead.agent || selectedAgentName,
            contact: lead.name,
            category: "Appt Booked Lead",
            action: lead.stage || "Stage: Appointment Booked",
            details: `Email: ${lead.email || "-"} | Phone: ${lead.phone || "-"}`
          }));
        }
        return actions
          .filter((act) => act.module === "OPPORTUNITY" && act.details && act.details.includes('"pipelineStageName":"Appointment Booked"'))
          .map((act) => {
            const { contactName, cleanDetails, actionStr } = parseActionDetails(act);
            return {
              time: formatTime(act.timestamp),
              agent: selectedAgentName,
              contact: contactName,
              category: "Appt Booked",
              action: actionStr,
              details: cleanDetails
            };
          });
      case "todayConverted":
        if (Array.isArray(selectedAgent.today_conversion_leads) && selectedAgent.today_conversion_leads.length > 0) {
          return selectedAgent.today_conversion_leads.map((lead) => ({
            time: lead.date ? formatTime(lead.date) : "00:00 BST",
            agent: lead.agent || selectedAgentName,
            contact: lead.name,
            category: "Converted Lead Today",
            action: lead.stage || "Converted",
            details: `Email: ${lead.email || "-"} | Phone: ${lead.phone || "-"}`
          }));
        }
        return actions
          .filter((act) => act.module === "OPPORTUNITY" && act.details && (act.details.includes('"pipelineStageName":"Booked"') || act.details.includes('"pipelineStageName":"Appointment Booked"')))
          .map((act) => {
            const { contactName, cleanDetails, actionStr } = parseActionDetails(act);
            return {
              time: formatTime(act.timestamp),
              agent: selectedAgentName,
              contact: contactName,
              category: "Converted Lead",
              action: actionStr,
              details: cleanDetails
            };
          });
      case "interactedLeads":
        return actions
          .filter((act) => act.module === "OPPORTUNITY" || act.module === "CONTACT" || act.module === "NOTE" || act.module === "TASK")
          .map((act) => {
            const { contactName, cleanDetails, actionStr } = parseActionDetails(act);
            return {
              time: formatTime(act.timestamp),
              agent: selectedAgentName,
              contact: contactName,
              category: `CRM Update: ${act.module}`,
              action: actionStr,
              details: cleanDetails
            };
          });
      case "interactedConversions":
        return actions
          .filter((act) => act.module === "OPPORTUNITY" && act.details && (act.details.includes('"pipelineStageName":"Booked"') || act.details.includes('"pipelineStageName":"Appointment Booked"') || act.details.includes('"status":"won"')))
          .map((act) => {
            const { contactName, cleanDetails, actionStr } = parseActionDetails(act);
            return {
              time: formatTime(act.timestamp),
              agent: selectedAgentName,
              contact: contactName,
              category: "Conversion Stage Hit",
              action: actionStr,
              details: cleanDetails
            };
          });
      case "totalConversations":
        return agentMessages.map((msg) => ({
          time: formatTime(msg.time),
          agent: selectedAgentName,
          contact: msg.contactName || "Unknown",
          category: "GHL Msg",
          action: "Outbound Text",
          details: msg.body
        }));
      case "callsPlaced":
        return callsList.map((c) => ({
          time: formatTime(c.timestamp),
          agent: selectedAgentName,
          contact: c.contact_name || "Unknown",
          category: "Voice Call",
          action: `${c.direction.toUpperCase()} - ${c.status}`,
          details: `Duration: ${c.duration}`
        }));
      case "missedCalls":
        return callsList
          .filter((c) => c.direction === "inbound" && c.status !== "Answered")
          .map((c) => ({
            time: formatTime(c.timestamp),
            agent: selectedAgentName,
            contact: c.contact_name || "Unknown",
            category: "Missed Call",
            action: `${c.direction.toUpperCase()} - ${c.status}`,
            details: `Unattended voice lead | Duration: ${c.duration}`
          }));
      case "notes":
        return actions
          .filter((act) => act.module === "NOTE")
          .map((act) => {
            const { contactName, cleanDetails, actionStr } = parseActionDetails(act);
            return {
              time: formatTime(act.timestamp),
              agent: selectedAgentName,
              contact: contactName,
              category: "CRM Note",
              action: actionStr,
              details: cleanDetails
            };
          });
      case "tasks":
        return actions
          .filter((act) => act.module === "TASK")
          .map((act) => {
            const { contactName, cleanDetails, actionStr } = parseActionDetails(act);
            return {
              time: formatTime(act.timestamp),
              agent: selectedAgentName,
              contact: contactName,
              category: "CRM Task",
              action: actionStr,
              details: cleanDetails
            };
          });
      case "interested":
        return actions
          .filter((act) => act.module === "OPPORTUNITY" && act.details && act.details.includes('"pipelineStageName":"Interested"'))
          .map((act) => {
            const { contactName, cleanDetails, actionStr } = parseActionDetails(act);
            return {
              time: formatTime(act.timestamp),
              agent: selectedAgentName,
              contact: contactName,
              category: "Interested Stage",
              action: actionStr,
              details: cleanDetails
            };
          });
      case "contacted":
        return actions
          .filter((act) => act.module === "OPPORTUNITY" && act.details && act.details.includes('"pipelineStageName":"Contacted"'))
          .map((act) => {
            const { contactName, cleanDetails, actionStr } = parseActionDetails(act);
            return {
              time: formatTime(act.timestamp),
              agent: selectedAgentName,
              contact: contactName,
              category: "Contacted Stage",
              action: actionStr,
              details: cleanDetails
            };
          });
      case "referrals":
        return actions
          .filter((act) => act.details && act.details.toLowerCase().includes("referral"))
          .map((act) => {
            const { contactName, cleanDetails, actionStr } = parseActionDetails(act);
            return {
              time: formatTime(act.timestamp),
              agent: selectedAgentName,
              contact: contactName,
              category: "Referral Log",
              action: actionStr,
              details: cleanDetails
            };
          });
      case "generalRate":
      case "bookedRate":
        if (Array.isArray(selectedAgent.booked_leads_details) && selectedAgent.booked_leads_details.length > 0) {
          return selectedAgent.booked_leads_details.map((lead) => ({
            time: lead.date ? formatTime(lead.date) : "00:00 BST",
            agent: lead.agent || selectedAgentName,
            contact: lead.name,
            category: "Booked Lead Details",
            action: lead.stage || "Booked",
            details: `Email: ${lead.email || "-"} | Phone: ${lead.phone || "-"}`
          }));
        }
        return [];
      case "closedRate":
        if (Array.isArray(selectedAgent.closed_leads_details) && selectedAgent.closed_leads_details.length > 0) {
          return selectedAgent.closed_leads_details.map((lead) => ({
            time: lead.date ? formatTime(lead.date) : "00:00 BST",
            agent: lead.agent || selectedAgentName,
            contact: lead.name,
            category: "Closed Lead Details",
            action: lead.stage || "Closed",
            details: `Email: ${lead.email || "-"} | Phone: ${lead.phone || "-"}`
          }));
        }
        return [];
      case "totalActions":
      default:
        return actions.map((act) => {
          const { contactName, cleanDetails, actionStr } = parseActionDetails(act);
          return {
            time: formatTime(act.timestamp),
            agent: selectedAgentName,
            contact: contactName,
            category: act.module,
            action: actionStr,
            details: cleanDetails
          };
        });
    }
  };

  const records = getRecords();
  const activeCardInfo = cards.find((c) => c.key === activeCard) || cards[0];

  const itemsPerPage = 5;
  const totalPages = Math.ceil(records.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRecords = records.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Selector controls */}
      <div
        className="card"
        style={{
          padding: "1.2rem 1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800 }}>
            Workspace Activity & Performance Metrics
          </h3>
          <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
            Select an agent to inspect their daily metric totals and detailed records.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-secondary)" }}>
            Agent Filter:
          </label>
          
          {/* Custom designed dropdown overlay to replace native select */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{
                padding: "0.5rem 1.5rem 0.5rem 1rem",
                borderRadius: "8px",
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
                color: "var(--text-primary)",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              {selectedAgentName}
              <i className={`fa-solid fa-chevron-${dropdownOpen ? "up" : "down"}`} style={{ fontSize: "0.75rem", marginLeft: "0.25rem", color: "var(--primary)" }}></i>
            </button>

            {dropdownOpen && (
              <>
                <div
                  onClick={() => setDropdownOpen(false)}
                  style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 9999,
                    background: "transparent",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: "105%",
                    right: 0,
                    minWidth: "200px",
                    maxHeight: "450px",
                    overflowY: "auto",
                    zIndex: 10000,
                    borderRadius: "8px",
                    border: "1px solid var(--card-border)",
                    background: "var(--card-bg)",
                    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.3)",
                    padding: "0.4rem 0",
                  }}
                >
                  {/* All Agents option */}
                  <div
                    onClick={() => {
                      setSelectedAgentName("All Agents");
                      setDropdownOpen(false);
                    }}
                    style={{
                      padding: "0.6rem 1rem",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: selectedAgentName === "All Agents" ? "var(--primary)" : "var(--text-primary)",
                      background: selectedAgentName === "All Agents" ? "rgba(209,92,46,0.08)" : "transparent",
                      cursor: "pointer",
                      transition: "background 0.15s ease",
                      borderBottom: "1px solid var(--card-border)"
                    }}
                    onMouseEnter={(e) => {
                      if (selectedAgentName !== "All Agents") {
                        e.currentTarget.style.background = "var(--border-light)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedAgentName !== "All Agents") {
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    All Agents
                  </div>

                  {agents.map((a) => (
                    <div
                      key={a.name}
                      onClick={() => {
                        setSelectedAgentName(a.name);
                        setDropdownOpen(false);
                      }}
                      style={{
                        padding: "0.6rem 1rem",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: selectedAgentName === a.name ? "var(--primary)" : "var(--text-primary)",
                        background: selectedAgentName === a.name ? "rgba(209,92,46,0.08)" : "transparent",
                        cursor: "pointer",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (selectedAgentName !== a.name) {
                          e.currentTarget.style.background = "var(--border-light)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedAgentName !== a.name) {
                          e.currentTarget.style.background = "transparent";
                        }
                      }}
                    >
                      {a.name}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Matrix Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1.25rem",
        }}
      >
        {cards.map((c) => {
          const isSelected = activeCard === c.key;
          return (
            <div
              key={c.key}
              onClick={() => {
                setActiveCard(c.key);
                setCurrentPage(1);
                setShowModal(true);
              }}
              className="metric-card-wrapper card"
              data-tooltip={c.tooltip}
              style={{
                padding: "1.5rem 1.2rem",
                textAlign: "center",
                position: "relative",
                cursor: "pointer",
                border: isSelected ? "2.5px solid var(--primary)" : "1px solid var(--card-border)",
                transform: isSelected ? "scale(1.02)" : "scale(1)",
                boxShadow: isSelected ? "0 4px 15px rgba(209,92,46,0.25)" : "var(--shadow)",
                transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              <h4 style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-secondary)", fontWeight: 700 }}>
                {c.title}
              </h4>
              <div style={{ fontSize: "2.3rem", fontWeight: 800, color: "var(--text-primary)", margin: "0.6rem 0" }}>
                {c.value}
              </div>
              <span style={{ fontSize: "0.72rem", color: "var(--primary)", background: "rgba(209,92,46,0.08)", padding: "0.2rem 0.6rem", borderRadius: "20px", fontWeight: 600 }}>
                {c.sub}
              </span>
            </div>
          );
        })}
      </div>

      {/* Modal Popup for Metric Detail Records */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100000,
            padding: "1rem",
            animation: "fadeIn 0.2s ease-out"
          }}
        >
          <div
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              borderRadius: "16px",
              width: "95%",
              maxWidth: "1000px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              display: "flex",
              flexDirection: "column",
              maxHeight: "90vh",
              overflow: "hidden"
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "1.25rem 1.5rem",
                borderBottom: "1px solid var(--card-border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "var(--text-primary)" }}>
                  Records Details: {activeCardInfo.title} ({records.length} items)
                </h3>
                <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  Underlying GHL CRM details compiled today for <strong>{selectedAgentName}</strong>.
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "none",
                  color: "var(--text-primary)",
                  width: "2.2rem",
                  height: "2.2rem",
                  borderRadius: "50%",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.1rem",
                  transition: "background 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.05)"}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "1.5rem", flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", gap: "1rem" }}>
              {records.length === 0 ? (
                <div style={{ padding: "4rem 2rem", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                  <i className="fa-solid fa-folder-open" style={{ fontSize: "2.5rem", display: "block", marginBottom: "0.75rem", opacity: 0.5 }}></i>
                  No logs or records found matching this metric today.
                </div>
              ) : (
                <>
                  {/* Horizontally scrollable container (no vertical scrolling) */}
                  <div style={{ width: "100%", overflowX: "auto", border: "1px solid var(--card-border)", borderRadius: "10px" }}>
                    <table className="print-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", minWidth: "900px" }}>
                      <thead>
                        <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--card-border)" }}>
                          <th style={{ padding: "0.85rem 1rem", fontWeight: 700, color: "var(--text-secondary)", textAlign: "left" }}>Time</th>
                          {selectedAgentName === "All Agents" && (
                            <th style={{ padding: "0.85rem 1rem", fontWeight: 700, color: "var(--text-secondary)", textAlign: "left" }}>Agent</th>
                          )}
                          <th style={{ padding: "0.85rem 1rem", fontWeight: 700, color: "var(--text-secondary)", textAlign: "left" }}>Contact Name</th>
                          <th style={{ padding: "0.85rem 1rem", fontWeight: 700, color: "var(--text-secondary)", textAlign: "left" }}>Category</th>
                          <th style={{ padding: "0.85rem 1rem", fontWeight: 700, color: "var(--text-secondary)", textAlign: "left" }}>Action/Status</th>
                          <th style={{ padding: "0.85rem 1rem", fontWeight: 700, color: "var(--text-secondary)", textAlign: "left" }}>Details Summary</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedRecords.map((r, idx) => (
                          <tr key={idx} style={{ borderBottom: idx < paginatedRecords.length - 1 ? "1px solid var(--card-border)" : "none" }}>
                            <td style={{ padding: "0.85rem 1rem", fontWeight: 600, color: "var(--primary)", whiteSpace: "nowrap", textAlign: "left" }}>{r.time}</td>
                            {selectedAgentName === "All Agents" && (
                              <td style={{ padding: "0.85rem 1rem", fontWeight: 600, whiteSpace: "nowrap", textAlign: "left" }}>{r.agent}</td>
                            )}
                            <td style={{ padding: "0.85rem 1rem", fontWeight: 700, whiteSpace: "nowrap", textAlign: "left" }}>{r.contact}</td>
                            <td style={{ padding: "0.85rem 1rem", whiteSpace: "nowrap", textAlign: "left" }}>{r.category}</td>
                            <td style={{ padding: "0.85rem 1rem", color: "var(--text-secondary)", whiteSpace: "nowrap", textAlign: "left" }}>
                              <span style={{
                                padding: "0.25rem 0.55rem",
                                borderRadius: "4px",
                                background: r.action && (r.action.toLowerCase().includes("answered") || r.action.toLowerCase().includes("won") || r.action.toLowerCase().includes("created") || r.action.toLowerCase().includes("collected") || r.action.toLowerCase().includes("margin") || r.action.toLowerCase().includes("source")) ? "rgba(113,167,88,0.12)" : "rgba(255,255,255,0.04)",
                                color: r.action && (r.action.toLowerCase().includes("answered") || r.action.toLowerCase().includes("won") || r.action.toLowerCase().includes("created") || r.action.toLowerCase().includes("collected") || r.action.toLowerCase().includes("margin") || r.action.toLowerCase().includes("source")) ? "var(--success)" : "var(--text-primary)",
                                fontWeight: 600
                              }}>
                                {r.action}
                              </span>
                            </td>
                            <td style={{ padding: "0.85rem 1rem", color: "var(--text-secondary)", fontStyle: "italic", textAlign: "left" }}>{r.details}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Horizontal Pagination navigation buttons */}
                  {totalPages > 1 && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.5rem" }}>
                      <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                        Showing page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({records.length} total entries)
                      </span>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          style={{
                            padding: "0.45rem 0.9rem",
                            borderRadius: "6px",
                            border: "1px solid var(--card-border)",
                            background: currentPage === 1 ? "transparent" : "var(--card-bg)",
                            color: currentPage === 1 ? "var(--text-secondary)" : "var(--text-primary)",
                            cursor: currentPage === 1 ? "not-allowed" : "pointer",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            transition: "all 0.2s"
                          }}
                        >
                          <i className="fa-solid fa-chevron-left" style={{ marginRight: "0.3rem" }}></i> Previous
                        </button>
                        <button
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          style={{
                            padding: "0.45rem 0.9rem",
                            borderRadius: "6px",
                            border: "1px solid var(--card-border)",
                            background: currentPage === totalPages ? "transparent" : "var(--card-bg)",
                            color: currentPage === totalPages ? "var(--text-secondary)" : "var(--text-primary)",
                            cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            transition: "all 0.2s"
                          }}
                        >
                          Next <i className="fa-solid fa-chevron-right" style={{ marginLeft: "0.3rem" }}></i>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filtered Agent Timeline (Activity Graph) */}
      <div className="card" style={{ padding: "1.5rem" }}>
        <h3 style={{ margin: "0 0 1.25rem 0", fontSize: "1.05rem", fontWeight: 800 }}>
          {selectedAgentName} Activity Timeline
        </h3>
        <TeamTimeline
          agents={selectedAgentName === "All Agents" ? agents : [selectedAgent]}
          selectedAgent={null}
          onSelectAgent={() => {}}
          reportDate={reportDate}
          hideNames={selectedAgentName === "All Agents" ? false : true}
          theme={theme}
        />
      </div>
    </div>
  );
}
