"use client";

import React, { useRef, useEffect, useState } from "react";

export default function ExecutiveReport({ agents, bstCallsList = [], bstUpdatesList = [], activeSection = "", reportDate = "2026-07-17", ghlMessages = [], timezone = "PKT", theme = "dark" }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [hoveredItem, setHoveredItem] = useState(null); // { type, agent, time, label, x, y }
  const [selectedAgents, setSelectedAgents] = useState(agents.map(a => a.name));
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Active Dropdown Tracker (replaces individual show states to prevent overlapping panels!)
  const [activeDropdown, setActiveDropdown] = useState(null); // 'timelineAgents', 'table1Agents', 'table1Cols', 'table2Agents', 'table2Cols', 'table3Agents', 'table3Cols'

  // Time workday window bounds state
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(20);

  // Checklist filters for visual events
  const [filterGhlUpdates, setFilterGhlUpdates] = useState(true);
  const [filterGhlMessages, setFilterGhlMessages] = useState(true);
  const [filterCalls, setFilterCalls] = useState(true);
  const [filterMissedOnly, setFilterMissedOnly] = useState(false);
  const [filterNotesOnly, setFilterNotesOnly] = useState(true);
  const [filterOppsOnly, setFilterOppsOnly] = useState(true);
  const [filterContactsOnly, setFilterContactsOnly] = useState(true);

  // Table 1 Customizer states
  const [table1Agents, setTable1Agents] = useState(agents.map(a => a.name));
  const [table1VisibleCols, setTable1VisibleCols] = useState(["newLeads", "referrals", "apptBooked", "closedLeads", "bookedLeads", "margin", "interested", "contacted", "notes", "generalConv"]);

  // Table 2 Customizer states
  const [table2Agents, setTable2Agents] = useState(agents.map(a => a.name));
  const [table2VisibleCols, setTable2VisibleCols] = useState(["newLeadsToday", "referralsToday", "convertedToday", "todayConvRate"]);

  // Table 3 Customizer states
  const [table3Agents, setTable3Agents] = useState(agents.map(a => a.name));
  const [table3VisibleCols, setTable3VisibleCols] = useState(["outboundCount", "outboundAttended", "outboundMissed", "outboundMinutes", "outboundAvgDuration", "inboundCount", "inboundAttended", "inboundMissed", "inboundMinutes", "inboundAvgDuration"]);

  // Sync selected agents when data loads
  useEffect(() => {
    setSelectedAgents(agents.map(a => a.name));
    setTable1Agents(agents.map(a => a.name));
    setTable2Agents(agents.map(a => a.name));
    setTable3Agents(agents.map(a => a.name));
  }, [agents]);

  // Columns metadata definitions
  const table1ColumnsMetadata = [
    { key: "newLeads", label: "New Leads" },
    { key: "referrals", label: "Ref" },
    { key: "apptBooked", label: "Appt" },
    { key: "closedLeads", label: "Closed" },
    { key: "bookedLeads", label: "Booked" },
    { key: "margin", label: "Margin" },
    { key: "interested", label: "Interest" },
    { key: "contacted", label: "Contact" },
    { key: "notes", label: "Notes" },
    { key: "generalConv", label: "Conv %" },
  ];

  const table2ColumnsMetadata = [
    { key: "newLeadsToday", label: "Today's New Leads" },
    { key: "referralsToday", label: "Today's Referrals" },
    { key: "convertedToday", label: "Today's Converted" },
    { key: "todayConvRate", label: "Today's Conversion Rate" },
  ];

  const table3ColumnsMetadata = [
    { key: "outboundCount", label: "Outbound Calls" },
    { key: "outboundAttended", label: "Outbound Answered" },
    { key: "outboundMissed", label: "Outbound Missed" },
    { key: "outboundMinutes", label: "Outbound Total Mins" },
    { key: "outboundAvgDuration", label: "Outbound Avg Dur" },
    { key: "inboundCount", label: "Inbound Calls" },
    { key: "inboundAttended", label: "Inbound Answered" },
    { key: "inboundMissed", label: "Inbound Missed" },
    { key: "inboundMinutes", label: "Inbound Total Mins" },
    { key: "inboundAvgDuration", label: "Inbound Avg Dur" },
  ];

  const toggleDropdown = (dropdownKey) => {
    if (activeDropdown === dropdownKey) {
      setActiveDropdown(null);
    } else {
      setActiveDropdown(dropdownKey);
    }
  };

  const closeDropdowns = () => {
    setActiveDropdown(null);
  };

  // Track containerRef width via ResizeObserver so canvas re-draws when section becomes visible
  useEffect(() => {
    // Give the DOM a tick to render the conditional block
    const timer = setTimeout(() => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      if (w > 0) setContainerWidth(w);
      
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const width = entry.contentRect.width;
          if (width > 0) setContainerWidth(width);
        }
      });
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }, 50);
    return () => clearTimeout(timer);
  }, [activeSection]);

  // Canvas styling constants
  const timelineLeftMargin = 160;
  const timelineRightMargin = 40;
  const timelineRowHeight = 40;
  const timelineTopMargin = 30;
  const timelineBottomMargin = 20;

  // BST Limits based on startHour and endHour
  const getMinTime = () => {
    const [yr, mo, dy] = reportDate.split("-").map(Number);
    return new Date(Date.UTC(yr, mo - 1, dy, startHour, 0, 0));
  };
  const getMaxTime = () => {
    const [yr, mo, dy] = reportDate.split("-").map(Number);
    return new Date(Date.UTC(yr, mo - 1, dy, endHour, 0, 0));
  };

  const getX = (timeMs, width) => {
    const startMs = getMinTime().getTime();
    const endMs = getMaxTime().getTime();
    const drawableWidth = width - timelineLeftMargin - timelineRightMargin;
    const fraction = (timeMs - startMs) / (endMs - startMs);
    return timelineLeftMargin + fraction * drawableWidth;
  };

  const formatBSTTime = (dateObj) => {
    return (
      dateObj.getUTCHours().toString().padStart(2, "0") +
      ":" +
      dateObj.getUTCMinutes().toString().padStart(2, "0")
    );
  };

  // Formatted details renderer for GHL action updates
  const renderFormattedDetails = (detailsStr) => {
    if (!detailsStr) return null;
    
    try {
      const parsed = JSON.parse(detailsStr);
      
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", background: "rgba(255,255,255,0.01)", padding: "0.85rem 1rem", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.04)" }}>
          {parsed.body && (
            <div>
              <span style={{ color: "var(--primary)", fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase" }}>Content / Body:</span>
              <div 
                style={{ marginTop: "2px", color: "#f8fafc", fontSize: "0.82rem", lineHeight: "1.4" }}
                dangerouslySetInnerHTML={{ __html: parsed.body }}
              />
            </div>
          )}
          {parsed.pipelineStageName && (
            <div>
              <span style={{ color: "var(--primary)", fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase" }}>Pipeline Stage:</span>
              <span style={{ marginLeft: "0.4rem", color: "#f8fafc", fontWeight: 700 }}>{parsed.pipelineStageName}</span>
            </div>
          )}
          {parsed.pipelineName && (
            <div>
              <span style={{ color: "var(--text-secondary)", fontWeight: 700, fontSize: "0.75rem" }}>Pipeline Name:</span>
              <span style={{ marginLeft: "0.4rem", color: "#e2e8f0" }}>{parsed.pipelineName}</span>
            </div>
          )}
          {parsed.status && (
            <div>
              <span style={{ color: "var(--text-secondary)", fontWeight: 700, fontSize: "0.75rem" }}>Opportunity Status:</span>
              <span style={{ marginLeft: "0.4rem", color: "#e2e8f0", textTransform: "capitalize" }}>{parsed.status}</span>
            </div>
          )}
          {parsed.contactId && (
            <div>
              <span style={{ color: "var(--text-secondary)", fontWeight: 700, fontSize: "0.75rem" }}>Contact Record ID:</span>
              <span style={{ marginLeft: "0.4rem", color: "#cbd5e1", fontFamily: "monospace" }}>{parsed.contactId}</span>
            </div>
          )}
          {parsed.relations && parsed.relations.length > 0 && (
            <div style={{ marginTop: "0.25rem", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "0.25rem" }}>
              <span style={{ color: "var(--text-secondary)", fontWeight: 700, fontSize: "0.75rem", display: "block", marginBottom: "2px" }}>Linked Relations:</span>
              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                {parsed.relations.map((rel, idx) => (
                  <span key={idx} style={{ background: "rgba(255,255,255,0.05)", padding: "0.15rem 0.4rem", borderRadius: "4px", fontSize: "0.7rem", fontFamily: "monospace", color: "#cbd5e1" }}>
                    {rel.objectKey}: {rel.recordId}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Other raw metadata properties if they exist */}
          {Object.entries(parsed).some(([key]) => !["body", "pipelineStageName", "pipelineName", "status", "contactId", "relations"].includes(key)) && (
            <div style={{ marginTop: "0.25rem", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "0.25rem" }}>
              <span style={{ color: "var(--text-secondary)", fontWeight: 700, fontSize: "0.75rem", display: "block", marginBottom: "2px" }}>Metadata:</span>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "0.75rem" }}>
                {Object.entries(parsed)
                  .filter(([key]) => !["body", "pipelineStageName", "pipelineName", "status", "contactId", "relations"].includes(key))
                  .map(([key, val]) => (
                    <div key={key}>
                      <strong style={{ color: "#aaca9b" }}>{key}:</strong> <span style={{ color: "#cbd5e1" }}>{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      );
    } catch (e) {
      return (
        <code style={{ display: "block", background: "rgba(0,0,0,0.2)", padding: "0.6rem 0.8rem", borderRadius: "6px", fontSize: "0.8rem", border: "1px solid rgba(255,255,255,0.03)", wordBreak: "break-all", whiteSpace: "pre-wrap", color: "#e2e8f0" }}>
          {detailsStr}
        </code>
      );
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = containerRef.current.clientWidth;
    
    // Filter agents list based on multi-select checkbox array
    const filteredAgents = agents.filter(a => selectedAgents.includes(a.name));
    const displayHeight = timelineTopMargin + timelineBottomMargin + Math.max(1, filteredAgents.length) * timelineRowHeight;

    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
    ctx.scale(dpr, dpr);

    const isDark = document.body.classList.contains("dark-mode") || !document.body.classList.contains("light-mode");
    ctx.clearRect(0, 0, displayWidth, displayHeight);

    // 1. Draw Grid Lines and Labels
    ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)";
    ctx.lineWidth = 1;
    ctx.font = "500 11px Outfit";
    ctx.fillStyle = "#64748b";
    ctx.textAlign = "center";

    const startMs = getMinTime().getTime();
    const endMs = getMaxTime().getTime();
    const drawDate = new Date(startMs);

    while (drawDate.getTime() <= endMs) {
      const xVal = getX(drawDate.getTime(), displayWidth);
      ctx.beginPath();
      ctx.moveTo(xVal, timelineTopMargin - 10);
      ctx.lineTo(xVal, displayHeight - timelineBottomMargin);
      ctx.stroke();

      const label = formatBSTTime(drawDate) + " BST";
      ctx.fillText(label, xVal, timelineTopMargin - 15);

      drawDate.setUTCHours(drawDate.getUTCHours() + 1);
    }

    // 2. Draw rows and scatter points for each agent
    filteredAgents.forEach((agent, idx) => {
      const rowTop = timelineTopMargin + idx * timelineRowHeight;
      const yCenter = rowTop + timelineRowHeight / 2;

      // Divider line
      ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.04)";
      ctx.beginPath();
      ctx.moveTo(0, rowTop + timelineRowHeight);
      ctx.lineTo(displayWidth, rowTop + timelineRowHeight);
      ctx.stroke();

      // Agent Y-Label
      ctx.fillStyle = isDark ? "#faefea" : "#2a1209";
      ctx.font = "600 12px Outfit";
      ctx.textAlign = "left";
      ctx.fillText(agent.name, 15, yCenter + 4);

      // Filter GHL updates
      if (filterGhlUpdates) {
        let updatesForAgent = bstUpdatesList.filter(
          (up) => up.agent === agent.name && up.time >= getMinTime() && up.time <= getMaxTime()
        );

        updatesForAgent = updatesForAgent.filter(up => {
          if (up.module === "NOTE") return filterNotesOnly;
          if (up.module === "OPPORTUNITY") return filterOppsOnly;
          if (up.module === "CONTACT") return filterContactsOnly;
          return false;
        });

        updatesForAgent.forEach((up) => {
          const xVal = getX(up.time.getTime(), displayWidth);
          const isHovered = hoveredItem && hoveredItem.type === "update" && hoveredItem.data === up;

          ctx.fillStyle = "#818cf8"; // Light purple-blue circle
          ctx.beginPath();
          ctx.arc(xVal, yCenter, isHovered ? 7.5 : 5, 0, 2 * Math.PI);
          ctx.fill();

          if (isHovered) {
            ctx.strokeStyle = "white";
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        });
      }

      // Filter GHL Messages (Outbound Messages)
      if (filterGhlMessages && ghlMessages) {
        let messagesForAgent = ghlMessages.filter(
          (m) => m.agent === agent.name && new Date(m.time) >= getMinTime() && new Date(m.time) <= getMaxTime()
        );

        messagesForAgent.forEach((msg) => {
          const xVal = getX(new Date(msg.time).getTime(), displayWidth);
          const isHovered = hoveredItem && hoveredItem.type === "message" && hoveredItem.data === msg;

          ctx.fillStyle = "#38bdf8"; // Sky blue circle
          ctx.beginPath();
          ctx.arc(xVal, yCenter, isHovered ? 7.5 : 5, 0, 2 * Math.PI);
          ctx.fill();

          if (isHovered) {
            ctx.strokeStyle = "white";
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        });
      }

      // Filter Calls
      if (filterCalls) {
        let callsForAgent = bstCallsList.filter(
          (cl) => cl.agent === agent.name && cl.time >= getMinTime() && cl.time <= getMaxTime()
        );

        if (filterMissedOnly) {
          callsForAgent = callsForAgent.filter(cl => cl.status && cl.status.toLowerCase() !== "answered");
        }

        callsForAgent.forEach((cl) => {
          const xVal = getX(cl.time.getTime(), displayWidth);
          const isHovered = hoveredItem && hoveredItem.type === "call" && hoveredItem.data === cl;

          ctx.fillStyle = "#fb923c"; // Light orange triangle
          ctx.beginPath();
          const size = isHovered ? 7.5 : 5.5;
          ctx.moveTo(xVal, yCenter - size);
          ctx.lineTo(xVal - size, yCenter + size - 1);
          ctx.lineTo(xVal + size, yCenter + size - 1);
          ctx.closePath();
          ctx.fill();

          if (isHovered) {
            ctx.strokeStyle = "white";
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }
        });
      }
    });
  }, [
    agents,
    bstCallsList,
    bstUpdatesList,
    hoveredItem,
    selectedAgents,
    startHour,
    endHour,
    filterGhlUpdates,
    filterGhlMessages,
    ghlMessages,
    reportDate,
    filterCalls,
    filterMissedOnly,
    filterNotesOnly,
    filterOppsOnly,
    filterContactsOnly,
    containerWidth,
    theme
  ]);

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const filteredAgents = agents.filter(a => selectedAgents.includes(a.name));

    if (y < timelineTopMargin || y > timelineTopMargin + filteredAgents.length * timelineRowHeight) {
      setHoveredItem(null);
      return;
    }

    const idx = Math.floor((y - timelineTopMargin) / timelineRowHeight);
    const agent = filteredAgents[idx];
    if (!agent) {
      setHoveredItem(null);
      return;
    }

    const displayWidth = rect.width;
    const yCenter = timelineTopMargin + idx * timelineRowHeight + timelineRowHeight / 2;

    let found = null;

    // Check GHL updates
    if (filterGhlUpdates) {
      let updatesForAgent = bstUpdatesList.filter(
        (up) => up.agent === agent.name && up.time >= getMinTime() && up.time <= getMaxTime()
      );

      updatesForAgent = updatesForAgent.filter(up => {
        if (up.module === "NOTE") return filterNotesOnly;
        if (up.module === "OPPORTUNITY") return filterOppsOnly;
        if (up.module === "CONTACT") return filterContactsOnly;
        return false;
      });

      for (const up of updatesForAgent) {
        const xVal = getX(up.time.getTime(), displayWidth);
        const dist = Math.sqrt((x - xVal) * (x - xVal) + (y - yCenter) * (y - yCenter));
        if (dist <= 8) {
          found = {
            type: "update",
            agent: agent.name,
            time: up.time,
            label: `GHL Log: ${up.module} - ${up.action}`,
            data: up,
            x: e.clientX,
            y: e.clientY,
          };
          break;
        }
      }
    }

    // Check GHL Outbound Messages
    if (!found && filterGhlMessages && ghlMessages) {
      let messagesForAgent = ghlMessages.filter(
        (m) => m.agent === agent.name && new Date(m.time) >= getMinTime() && new Date(m.time) <= getMaxTime()
      );

      for (const msg of messagesForAgent) {
        const xVal = getX(new Date(msg.time).getTime(), displayWidth);
        const dist = Math.sqrt((x - xVal) * (x - xVal) + (y - yCenter) * (y - yCenter));
        if (dist <= 8) {
          found = {
            type: "message",
            agent: agent.name,
            time: new Date(msg.time),
            label: `GHL Outbound Message: to ${msg.contactName}`,
            data: msg,
            x: e.clientX,
            y: e.clientY,
          };
          break;
        }
      }
    }

    // Check Call events
    if (!found && filterCalls) {
      let callsForAgent = bstCallsList.filter(
        (cl) => cl.agent === agent.name && cl.time >= getMinTime() && cl.time <= getMaxTime()
      );

      if (filterMissedOnly) {
        callsForAgent = callsForAgent.filter(cl => cl.status && cl.status.toLowerCase() !== "answered");
      }

      for (const cl of callsForAgent) {
        const xVal = getX(cl.time.getTime(), displayWidth);
        const dist = Math.sqrt((x - xVal) * (x - xVal) + (y - yCenter) * (y - yCenter));
        if (dist <= 8) {
          found = {
            type: "call",
            agent: agent.name,
            time: cl.time,
            label: `Call: ${cl.direction} (${cl.status}) - ${cl.duration}`,
            data: cl,
            x: e.clientX,
            y: e.clientY,
          };
          break;
        }
      }
    }

    setHoveredItem(found);
  };

  const handleCanvasClick = () => {
    if (hoveredItem) {
      setSelectedEvent(hoveredItem);
    }
  };

  const handleJsonExport = () => {
    const unifiedData = {
      date: reportDate,
      summary: {
        total_agents: agents.length,
        total_calls: bstCallsList?.length || 0,
        total_actions: bstUpdatesList?.length || 0,
        total_ghl_messages: ghlMessages?.length || 0
      },
      agents: agents.map(a => ({
        name: a.name,
        actions: a.actions,
        opps: a.opps,
        span: a.span,
        active: a.active,
        breaks: a.breaks,
        breakDuration: a.breakDuration,
        firstAction: a.firstAction,
        lastAction: a.lastAction,
        segmentations: a.segmentations,
        margin_added_today: a.margin_added_today,
        stage_interested_today: a.stage_interested_today,
        stage_contacted_today: a.stage_contacted_today,
        notes_updated_today: a.notes_updated_today,
        general_conv_rate: a.general_conv_rate,
        new_leads_today: a.new_leads_today,
        referrals_today: a.referrals_today,
        converted_today: a.converted_today,
        today_conv_rate: a.today_conv_rate,
        call_metrics: a.call_metrics
      })),
      calls: bstCallsList || [],
      audit_logs: bstUpdatesList || [],
      ghl_outbound_messages: ghlMessages || []
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(unifiedData, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `lifeline_report_${reportDate}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handlePrint = () => {
    const reportDateFormatted = new Date(reportDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

    let pdfTitle = "Executive Operations Report";
    let pdfFilename = `Executive_Report_${reportDate}.pdf`;
    let canvasImageSrc = "";

    if (activeSection === "exec-conversion") {
      pdfTitle = "Agent Conversion Metrics Report";
      pdfFilename = `Agent_Conversion_Report_${reportDate}.pdf`;
    } else if (activeSection === "exec-sprints") {
      pdfTitle = "Lead Sprints Analysis Report";
      pdfFilename = `Lead_Sprints_Report_${reportDate}.pdf`;
    } else if (activeSection === "exec-calls") {
      pdfTitle = "Call Analytics Metrics Report";
      pdfFilename = `Call_Analytics_Report_${reportDate}.pdf`;
    } else if (activeSection === "exec-timeline") {
      pdfTitle = "Visual Scatter Workday Timeline";
      pdfFilename = `Scatter_Workday_Timeline_${reportDate}.pdf`;
    } else if (activeSection === "exec-export" || activeSection === "executive-report") {
      pdfTitle = "Agent Performance & Activity Report";
      pdfFilename = `Agent_Performance_Report_${reportDate}.pdf`;
    }

    let reportBodyHTML = "";

    if (!activeSection || activeSection === "exec-conversion" || activeSection === "executive-report" || activeSection === "exec-export") {
      // Sort agents by margin_added_today descending
      const sortedAgents = [...agents].sort((a, b) => (b.margin_added_today || 0) - (a.margin_added_today || 0));

      const table1RowsHTML = sortedAgents.map((a, index) => {
        const seg = a.segmentations || {};
        const marginVal = typeof a.margin_added_today === "number" ? `$${a.margin_added_today.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : "$0.00";
        const rowBg = index % 2 === 0 ? "#ffffff" : "#f8fafc";
        return `
          <tr style="background: ${rowBg};">
            <td style="border: 1px solid #cbd5e1; padding: 5px 4px; font-weight: bold; text-align: center; color: #1e293b;">${a.name}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px 4px; text-align: center; color: #334155;">${seg.newLeads || 0}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px 4px; text-align: center; color: #334155;">${seg.referrals || 0}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px 4px; text-align: center; color: #334155;">${seg.apptBookedLeads || 0}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px 4px; text-align: center; color: #334155;">${seg.closedLeads || 0}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px 4px; text-align: center; color: #334155;">${seg.bookedLeads || 0}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px 4px; font-weight: bold; text-align: center; color: #0f172a;">${marginVal}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px 4px; text-align: center; color: #334155;">${a.stage_interested_today || 0}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px 4px; text-align: center; color: #334155;">${a.stage_contacted_today || 0}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px 4px; text-align: center; color: #334155;">${a.notes_updated_today || 0}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px 4px; font-weight: bold; text-align: center; color: #0f172a;">${a.general_conv_rate?.toFixed(1) || "0.0"}%</td>
          </tr>
        `;
      }).join("");

      reportBodyHTML += `
        <!-- Section 1: Table 1 -->
        <div style="margin-bottom: 1.5rem; page-break-inside: avoid; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div style="border-left: 4px solid #1b365d; padding-left: 8px; color: #1b365d; font-weight: bold; font-size: 11pt; margin-top: 1.5rem; margin-bottom: 0.6rem; text-transform: uppercase; letter-spacing: 0.5px;">
            1. Agent Conversion & Lead Metrics
          </div>
          <div style="font-size: 7.2pt; color: #64748b; margin-bottom: 0.5rem; font-style: italic; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            Glossary: REF = Referrals | APPT = Appointment Booked | CLOSED = Closed Leads | BOOKED = Booked Leads | INTEREST = Stage 'Interested' | CONTACT = Stage 'Contacted' | NOTES = Notes Updated | CONV % = Gen Conv Rate
          </div>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; font-size: 7.2pt; text-align: center; margin: 0 auto; table-layout: auto;">
            <thead>
              <tr style="background: #3c5a78; color: #ffffff; font-weight: bold;">
                <th style="border: 1px solid #cbd5e1; padding: 5px 2px; font-size: 6.8pt; text-align: center; width: 14%; white-space: nowrap;">AGENT</th>
                <th style="border: 1px solid #cbd5e1; padding: 5px 2px; font-size: 6.8pt; text-align: center; white-space: nowrap;">NEW LEADS</th>
                <th style="border: 1px solid #cbd5e1; padding: 5px 2px; font-size: 6.8pt; text-align: center; white-space: nowrap;">REF</th>
                <th style="border: 1px solid #cbd5e1; padding: 5px 2px; font-size: 6.8pt; text-align: center; white-space: nowrap;">APPT</th>
                <th style="border: 1px solid #cbd5e1; padding: 5px 2px; font-size: 6.8pt; text-align: center; white-space: nowrap;">CLOSED</th>
                <th style="border: 1px solid #cbd5e1; padding: 5px 2px; font-size: 6.8pt; text-align: center; white-space: nowrap;">BOOKED</th>
                <th style="border: 1px solid #cbd5e1; padding: 5px 2px; font-size: 6.8pt; text-align: center; white-space: nowrap;">MARGIN</th>
                <th style="border: 1px solid #cbd5e1; padding: 5px 2px; font-size: 6.8pt; text-align: center; white-space: nowrap;">INTEREST</th>
                <th style="border: 1px solid #cbd5e1; padding: 5px 2px; font-size: 6.8pt; text-align: center; white-space: nowrap;">CONTACT</th>
                <th style="border: 1px solid #cbd5e1; padding: 5px 2px; font-size: 6.8pt; text-align: center; white-space: nowrap;">NOTES</th>
                <th style="border: 1px solid #cbd5e1; padding: 5px 2px; font-size: 6.8pt; text-align: center; white-space: nowrap;">CONV %</th>
              </tr>
            </thead>
            <tbody>
              ${table1RowsHTML}
            </tbody>
          </table>
        </div>
      `;
    }

    if (!activeSection || activeSection === "exec-sprints" || activeSection === "executive-report" || activeSection === "exec-export") {
      const sortedAgents = [...agents].sort((a, b) => (b.converted_today || 0) - (a.converted_today || 0));

      const table2RowsHTML = sortedAgents.map((a, index) => {
        const rowBg = index % 2 === 0 ? "#ffffff" : "#f8fafc";
        return `
          <tr style="background: ${rowBg};">
            <td style="border: 1px solid #cbd5e1; padding: 5px 4px; font-weight: bold; text-align: center; color: #1e293b;">${a.name}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px 4px; text-align: center; color: #334155;">${a.new_leads_today || 0}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px 4px; text-align: center; color: #334155;">${a.referrals_today || 0}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px 4px; text-align: center; color: #334155;">${a.converted_today || 0}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px 4px; font-weight: bold; text-align: center; color: #0f172a;">${a.today_conv_rate?.toFixed(1) || "0.0"}%</td>
          </tr>
        `;
      }).join("");

      reportBodyHTML += `
        <!-- Section 2: Table 2 -->
        <div style="margin-bottom: 1.5rem; page-break-inside: avoid; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div style="border-left: 4px solid #1b365d; padding-left: 8px; color: #1b365d; font-weight: bold; font-size: 11pt; margin-top: 1.5rem; margin-bottom: 0.6rem; text-transform: uppercase; letter-spacing: 0.5px;">
            2. Today's (${formattedGlossaryDate}) New Leads Conversion
          </div>
          <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #cbd5e1; font-size: 7.2pt; text-align: center; margin: 0 auto; table-layout: auto;">
            <thead>
              <tr style="background: #3c5a78; color: #ffffff; font-weight: bold;">
                <th style="border: 1px solid #cbd5e1; padding: 5px 2px; font-size: 6.8pt; text-align: center; width: 20%; white-space: nowrap;">AGENT</th>
                <th style="border: 1px solid #cbd5e1; padding: 5px 2px; font-size: 6.8pt; text-align: center; width: 20%; white-space: nowrap;">TODAY'S NEW LEADS</th>
                <th style="border: 1px solid #cbd5e1; padding: 5px 2px; font-size: 6.8pt; text-align: center; width: 20%; white-space: nowrap;">TODAY'S REFERRALS</th>
                <th style="border: 1px solid #cbd5e1; padding: 5px 2px; font-size: 6.8pt; text-align: center; width: 20%; white-space: nowrap;">TODAY'S CONVERTED</th>
                <th style="border: 1px solid #cbd5e1; padding: 5px 2px; font-size: 6.8pt; text-align: center; width: 20%; white-space: nowrap;">TODAY'S CONV. RATE</th>
              </tr>
            </thead>
            <tbody>
              ${table2RowsHTML}
            </tbody>
          </table>
        </div>
      `;
    }

    if (!activeSection || activeSection === "exec-calls" || activeSection === "executive-report" || activeSection === "exec-export") {
      const sortedAgents = [...agents].sort((a, b) => {
        const totalA = (a.call_metrics?.outboundCount || 0) + (a.call_metrics?.inboundCount || 0);
        const totalB = (b.call_metrics?.outboundCount || 0) + (b.call_metrics?.inboundCount || 0);
        return totalB - totalA;
      });

      const table3RowsHTML = sortedAgents.map((a, index) => {
        const call = a.call_metrics || {};
        const rowBg = index % 2 === 0 ? "#ffffff" : "#f8fafc";
        return `
          <tr style="background: ${rowBg};">
            <td style="border: 1px solid #cbd5e1; padding: 5px 4px; font-weight: bold; text-align: center; color: #1e293b;">${a.name}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px 4px; text-align: center; color: #334155;">${call.outboundCount || 0}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px 4px; text-align: center; color: #334155;">${call.outboundAttended || 0}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px 4px; text-align: center; color: #334155;">${call.outboundMissed || 0}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px 4px; text-align: center; color: #334155;">${call.outboundMinutes?.toFixed(1) || "0.0"}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px 4px; text-align: center; color: #334155;">${call.outboundAvgDuration?.toFixed(1) || "0.0"}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px 4px; text-align: center; color: #334155;">${call.inboundCount || 0}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px 4px; text-align: center; color: #334155;">${call.inboundAttended || 0}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px 4px; text-align: center; color: #334155;">${call.inboundMissed || 0}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px 4px; text-align: center; color: #334155;">${call.inboundMinutes?.toFixed(1) || "0.0"}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px 4px; text-align: center; color: #334155;">${call.inboundAvgDuration?.toFixed(1) || "0.0"}</td>
          </tr>
        `;
      }).join("");

      reportBodyHTML += `
        <!-- Section 3: Table 3 -->
        <div style="margin-bottom: 1.5rem; page-break-inside: avoid; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div style="border-left: 4px solid #1b365d; padding-left: 8px; color: #1b365d; font-weight: bold; font-size: 11pt; margin-top: 1.5rem; margin-bottom: 0.6rem; text-transform: uppercase; letter-spacing: 0.5px;">
            3. Detailed Call Metrics (${formattedGlossaryDate} BST)
          </div>
          <div style="font-size: 7.2pt; color: #64748b; margin-bottom: 0.5rem; font-style: italic; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            Glossary: OUT = Outbound | IN = Inbound | CNT = Count | ANS = Answered | MISS = Missed | MINS = Total Call Minutes | AVG = Avg Duration (Mins)
          </div>
          <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #cbd5e1; font-size: 7.2pt; text-align: center; margin: 0 auto; table-layout: auto;">
            <thead>
              <tr style="background: #3c5a78; color: #ffffff; font-weight: bold;">
                <th style="border: 1px solid #cbd5e1; padding: 5px 2px; font-size: 6.8pt; text-align: center; width: 15%; white-space: nowrap;">AGENT</th>
                <th style="border: 1px solid #cbd5e1; padding: 5px 2px; font-size: 6.2pt; text-align: center; white-space: nowrap;">OUT CNT</th>
                <th style="border: 1px solid #cbd5e1; padding: 5px 2px; font-size: 6.2pt; text-align: center; white-space: nowrap;">OUT ANS</th>
                <th style="border: 1px solid #cbd5e1; padding: 5px 2px; font-size: 6.2pt; text-align: center; white-space: nowrap;">OUT MISS</th>
                <th style="border: 1px solid #cbd5e1; padding: 5px 2px; font-size: 6.2pt; text-align: center; white-space: nowrap;">OUT MINS</th>
                <th style="border: 1px solid #cbd5e1; padding: 5px 2px; font-size: 6.2pt; text-align: center; white-space: nowrap;">OUT AVG</th>
                <th style="border: 1px solid #cbd5e1; padding: 5px 2px; font-size: 6.2pt; text-align: center; white-space: nowrap;">IN CNT</th>
                <th style="border: 1px solid #cbd5e1; padding: 5px 2px; font-size: 6.2pt; text-align: center; white-space: nowrap;">IN ANS</th>
                <th style="border: 1px solid #cbd5e1; padding: 5px 2px; font-size: 6.2pt; text-align: center; white-space: nowrap;">IN MISS</th>
                <th style="border: 1px solid #cbd5e1; padding: 5px 2px; font-size: 6.2pt; text-align: center; white-space: nowrap;">IN MINS</th>
                <th style="border: 1px solid #cbd5e1; padding: 5px 2px; font-size: 6.2pt; text-align: center; white-space: nowrap;">IN AVG</th>
              </tr>
            </thead>
            <tbody>
              ${table3RowsHTML}
            </tbody>
          </table>
        </div>
      `;
    }

    if (activeSection === "exec-timeline" || activeSection === "exec-export" || activeSection === "executive-report" || !activeSection) {
      if (canvasRef.current) {
        // Canvas is already rendered — capture it directly
        try {
          const originalCanvas = canvasRef.current;
          
          const tempCanvas = document.createElement("canvas");
          tempCanvas.width = originalCanvas.width;
          tempCanvas.height = originalCanvas.height;
          const tempCtx = tempCanvas.getContext("2d");

          tempCtx.fillStyle = "#ffffff";
          tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

          const isDark = document.body.classList.contains("dark-mode");
          if (isDark) {
            tempCtx.filter = "invert(1) hue-rotate(180deg)";
          }

          tempCtx.drawImage(originalCanvas, 0, 0);
          canvasImageSrc = tempCanvas.toDataURL("image/png");
        } catch (e) {
          console.warn("Failed to get canvas data URL:", e);
        }
      } else {
        // Canvas not rendered — draw the timeline on an offscreen canvas from data
        try {
          const pdfWidth = 1500; // high-res offscreen width
          const filteredAgents = agents.filter(a => selectedAgents.includes(a.name));
          const offscreenHeight = timelineTopMargin + timelineBottomMargin + Math.max(1, filteredAgents.length) * timelineRowHeight;

          const offCanvas = document.createElement("canvas");
          offCanvas.width = pdfWidth;
          offCanvas.height = offscreenHeight;
          const ctx = offCanvas.getContext("2d");

          // White background
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, pdfWidth, offscreenHeight);

          // Grid lines and time labels
          ctx.strokeStyle = "rgba(0, 0, 0, 0.08)";
          ctx.lineWidth = 1;
          ctx.font = "500 11px sans-serif";
          ctx.fillStyle = "#64748b";
          ctx.textAlign = "center";

          const pdfStartMs = getMinTime().getTime();
          const pdfEndMs = getMaxTime().getTime();
          const pdfDrawDate = new Date(pdfStartMs);

          while (pdfDrawDate.getTime() <= pdfEndMs) {
            const xVal = getX(pdfDrawDate.getTime(), pdfWidth);
            ctx.beginPath();
            ctx.moveTo(xVal, timelineTopMargin - 10);
            ctx.lineTo(xVal, offscreenHeight - timelineBottomMargin);
            ctx.stroke();

            const label = formatBSTTime(pdfDrawDate) + " BST";
            ctx.fillStyle = "#64748b";
            ctx.fillText(label, xVal, timelineTopMargin - 15);

            pdfDrawDate.setUTCHours(pdfDrawDate.getUTCHours() + 1);
          }

          // Draw rows and scatter points for each agent
          filteredAgents.forEach((agent, idx) => {
            const rowTop = timelineTopMargin + idx * timelineRowHeight;
            const yCenter = rowTop + timelineRowHeight / 2;

            // Divider line
            ctx.strokeStyle = "rgba(0, 0, 0, 0.06)";
            ctx.beginPath();
            ctx.moveTo(0, rowTop + timelineRowHeight);
            ctx.lineTo(pdfWidth, rowTop + timelineRowHeight);
            ctx.stroke();

            // Agent name label
            ctx.fillStyle = "#1e293b";
            ctx.font = "600 12px sans-serif";
            ctx.textAlign = "left";
            ctx.fillText(agent.name, 15, yCenter + 4);

            // GHL Updates (purple dots)
            if (filterGhlUpdates) {
              let updatesForAgent = bstUpdatesList.filter(
                (up) => up.agent === agent.name && up.time >= getMinTime() && up.time <= getMaxTime()
              );
              updatesForAgent = updatesForAgent.filter(up => {
                if (up.module === "NOTE") return filterNotesOnly;
                if (up.module === "OPPORTUNITY") return filterOppsOnly;
                if (up.module === "CONTACT") return filterContactsOnly;
                return false;
              });
              updatesForAgent.forEach((up) => {
                const xVal = getX(up.time.getTime(), pdfWidth);
                ctx.fillStyle = "#818cf8";
                ctx.beginPath();
                ctx.arc(xVal, yCenter, 5, 0, 2 * Math.PI);
                ctx.fill();
              });
            }

            // GHL Messages (sky blue dots)
            if (filterGhlMessages && ghlMessages) {
              let messagesForAgent = ghlMessages.filter(
                (m) => m.agent === agent.name && new Date(m.time) >= getMinTime() && new Date(m.time) <= getMaxTime()
              );
              messagesForAgent.forEach((msg) => {
                const xVal = getX(new Date(msg.time).getTime(), pdfWidth);
                ctx.fillStyle = "#38bdf8";
                ctx.beginPath();
                ctx.arc(xVal, yCenter, 5, 0, 2 * Math.PI);
                ctx.fill();
              });
            }

            // Calls (orange triangles)
            if (filterCalls) {
              let callsForAgent = bstCallsList.filter(
                (cl) => cl.agent === agent.name && cl.time >= getMinTime() && cl.time <= getMaxTime()
              );
              if (filterMissedOnly) {
                callsForAgent = callsForAgent.filter(cl => cl.status && cl.status.toLowerCase() !== "answered");
              }
              callsForAgent.forEach((cl) => {
                const xVal = getX(cl.time.getTime(), pdfWidth);
                ctx.fillStyle = "#fb923c";
                ctx.beginPath();
                const size = 5.5;
                ctx.moveTo(xVal, yCenter - size);
                ctx.lineTo(xVal - size, yCenter + size - 1);
                ctx.lineTo(xVal + size, yCenter + size - 1);
                ctx.closePath();
                ctx.fill();
              });
            }
          });

          canvasImageSrc = offCanvas.toDataURL("image/png");
        } catch (e) {
          console.warn("Failed to render offscreen timeline:", e);
        }
      }

      reportBodyHTML += `
        <!-- Section: Scatter Timeline Image -->
        <div style="margin-top: 1.5rem; page-break-before: always; text-align: center; width: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div style="border-left: 4px solid #1b365d; padding-left: 8px; color: #1b365d; font-weight: bold; font-size: 11pt; margin-top: 1.5rem; margin-bottom: 0.6rem; text-transform: uppercase; letter-spacing: 0.5px; text-align: left;">
            4. Agent Activity Graph (${startHour.toString().padStart(2, "0")}:00 - ${endHour.toString().padStart(2, "0")}:00 BST)
          </div>
          <div style="border: 1px solid #cbd5e1; padding: 10px; background: #fff; width: 100%; box-sizing: border-box; border-radius: 4px;">
            ${canvasImageSrc ? `<img id="timeline-pdf-image" style="width: 100%; height: auto; display: block;" />` : `<div style="padding: 20px; font-style: italic; color: #64748b;">[Activity graph not available — Timeline tab must be loaded at least once]</div>`}
          </div>
        </div>
      `;
    }

    let titleBlockHTML = "";
    let glossaryBlockHTML = "";

    if (activeSection === "exec-export" || activeSection === "executive-report" || !activeSection) {
      titleBlockHTML = `
        <div style="background: #1b365d; color: #ffffff; padding: 18px; text-align: center; font-size: 16pt; font-weight: bold; margin-bottom: 1.5rem; border-radius: 4px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          Agent Performance & Activity Report (${reportDateFormatted})
        </div>
      `;
      glossaryBlockHTML = `
        <div style="border: 1px solid #cbd5e1; background: #f8fafc; border-radius: 8px; padding: 15px; margin-bottom: 1.5rem; font-size: 7.8pt; line-height: 1.45; color: #334155; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div style="font-size: 10.5pt; font-weight: bold; margin-bottom: 10px; border-left: 4px solid #1b365d; padding-left: 8px; color: #1b365d;">
            Glossary & Metric Definitions
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
              <p style="margin: 0 0 6px 0;"><strong>New Leads:</strong> Total count of new leads assigned to the agent.</p>
              <p style="margin: 0 0 6px 0;"><strong>Appt Booked / Booked Leads:</strong> Count of leads successfully converted to an appointment or booked status.</p>
              <p style="margin: 0 0 6px 0;"><strong>Closed Leads:</strong> Leads that have been marked as closed (e.g., lost or disqualified).</p>
              <p style="margin: 0 0 6px 0;"><strong>Margin ($):</strong> The total financial margin amount explicitly added or updated in the system.</p>
              <p style="margin: 0 0 6px 0;"><strong>Interested / Contacted:</strong> The number of times an agent advanced a lead's pipeline stage to "Interested" or "Contacted" per the system audit trail.</p>
              <p style="margin: 0 0 6px 0;"><strong>Notes Updated:</strong> Total number of CRM notes added/modified by the agent.</p>
            </div>
            <div>
              <p style="margin: 0 0 6px 0;"><strong>General Conv. Rate:</strong> (Booked Leads &divide; Eligible Interacted Base) &times; 100. The "Eligible Interacted Base" safely excludes leads that are already Closed or have Appointments Booked.</p>
              <p style="margin: 0 0 6px 0;"><strong>Today's New Leads:</strong> Leads that entered the system strictly on ${reportDateFormatted}.</p>
              <p style="margin: 0 0 6px 0;"><strong>Today's Converted & Conv. Rate:</strong> Leads created today that have already been marked as Appt Booked or Booked, and their resulting percentage.</p>
              <p style="margin: 0 0 6px 0;"><strong>Out / In Count:</strong> Total volume of outbound dialed calls or inbound received calls.</p>
              <p style="margin: 0 0 6px 0;"><strong>Attended / Missed:</strong> Breakdown of calls answered versus missed/voicemail.</p>
              <p style="margin: 0 0 6px 0;"><strong>Total / Avg (Mins):</strong> Aggregate talk time and the average duration per answered call.</p>
            </div>
          </div>
        </div>
      `;
    } else {
      titleBlockHTML = `
        <div style="text-align: center; margin-bottom: 1.2rem; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <h1 style="font-size: 15pt; font-weight: bold; margin-bottom: 0.2rem; text-transform: uppercase; color: #1b365d; letter-spacing: 0.5px;">
            ${pdfTitle}
          </h1>
          <div style="font-size: 9.5pt; font-style: italic; color: #475569; margin-bottom: 0.1rem;">
            LifeLine Agent Performance & Conversion Hub
          </div>
          <div style="font-size: 9.5pt; margin-bottom: 0.8rem; color: #475569;">
            Date: ${reportDateFormatted}
          </div>
          <hr style="border: 0; border-top: 1.5px solid #1b365d; margin: 0 auto; width: 25%;" />
        </div>
      `;
    }

    const latexTemplate = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; padding: 0.5in 0.6in; background: #fff; line-height: 1.35; font-size: 9pt; width: 100%; box-sizing: border-box;">
        ${titleBlockHTML}
        ${glossaryBlockHTML}
        ${reportBodyHTML}
      </div>
    `;

    const container = document.createElement("div");
    container.style.width = "750px";
    container.innerHTML = latexTemplate;

    // Force light-mode isolation wrapper to prevent dark theme CSS variables from bleeding in
    const isolationWrapper = document.createElement("div");
    isolationWrapper.style.cssText = `
      position: fixed; left: -9999px; top: 0; z-index: -1;
      background: #ffffff; color: #000000;
      --bg-color: #ffffff; --card-bg: #ffffff; --text-primary: #0f172a; --text-secondary: #475569;
      --card-border: #cbd5e1; --table-header: #f2f2f2; --table-hover: #f8fafc;
    `;
    isolationWrapper.appendChild(container);
    document.body.appendChild(isolationWrapper);

    const opt = {
      margin:       [0.5, 0.55, 0.5, 0.55],
      filename:     pdfFilename,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { 
        scale: 2.5, 
        useCORS: true, 
        backgroundColor: "#ffffff"
      },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    const runHtml2Pdf = () => {
      const finishPdfGeneration = () => {
        window.html2pdf().from(container).set(opt).save().then(() => {
          // Clean up: remove isolation wrapper from DOM
          if (isolationWrapper.parentNode) isolationWrapper.parentNode.removeChild(isolationWrapper);
        }).catch(err => {
          console.error("PDF generation error:", err);
          if (isolationWrapper.parentNode) isolationWrapper.parentNode.removeChild(isolationWrapper);
        });
      };

      if (canvasImageSrc) {
        const imgEl = container.querySelector("#timeline-pdf-image");
        if (imgEl) {
          imgEl.onload = () => {
            // Image is fully decoded in the container — safe to render PDF
            setTimeout(() => finishPdfGeneration(), 100);
          };
          imgEl.onerror = () => {
            console.warn("Container image failed to load, compiling without graph");
            finishPdfGeneration();
          };
          imgEl.src = canvasImageSrc;
        } else {
          finishPdfGeneration();
        }
      } else {
        finishPdfGeneration();
      }
    };

    if (window.html2pdf) {
      runHtml2Pdf();
    } else {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
      script.onload = () => {
        if (window.html2pdf) {
          runHtml2Pdf();
        }
      };
      document.body.appendChild(script);
    }
  };

  const handleDocx = () => {
    // Re-use the same report compilation logic from handlePrint
    const reportDateFormatted = new Date(reportDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
    let canvasImageSrc = "";

    // Capture the timeline canvas if available
    if (canvasRef.current) {
      try {
        const originalCanvas = canvasRef.current;
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = originalCanvas.width;
        tempCanvas.height = originalCanvas.height;
        const tempCtx = tempCanvas.getContext("2d");
        tempCtx.fillStyle = "#ffffff";
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        const isDark = document.body.classList.contains("dark-mode");
        if (isDark) { tempCtx.filter = "invert(1) hue-rotate(180deg)"; }
        tempCtx.drawImage(originalCanvas, 0, 0);
        canvasImageSrc = tempCanvas.toDataURL("image/png");
      } catch (e) { console.warn("Canvas capture failed for DOCX:", e); }
    } else {
      // Offscreen canvas fallback
      try {
        const pdfWidth = 1500;
        const filteredAgents = agents.filter(a => selectedAgents.includes(a.name));
        const offH = timelineTopMargin + timelineBottomMargin + Math.max(1, filteredAgents.length) * timelineRowHeight;
        const offCanvas = document.createElement("canvas");
        offCanvas.width = pdfWidth;
        offCanvas.height = offH;
        const ctx = offCanvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, pdfWidth, offH);
        ctx.strokeStyle = "rgba(0, 0, 0, 0.08)";
        ctx.lineWidth = 1;
        ctx.font = "500 11px sans-serif";
        ctx.fillStyle = "#64748b";
        ctx.textAlign = "center";
        const pdfStartMs = getMinTime().getTime();
        const pdfEndMs = getMaxTime().getTime();
        const pdfDrawDate = new Date(pdfStartMs);
        while (pdfDrawDate.getTime() <= pdfEndMs) {
          const xVal = getX(pdfDrawDate.getTime(), pdfWidth);
          ctx.beginPath(); ctx.moveTo(xVal, timelineTopMargin - 10); ctx.lineTo(xVal, offH - timelineBottomMargin); ctx.stroke();
          ctx.fillStyle = "#64748b"; ctx.fillText(formatBSTTime(pdfDrawDate) + " BST", xVal, timelineTopMargin - 15);
          pdfDrawDate.setUTCHours(pdfDrawDate.getUTCHours() + 1);
        }
        filteredAgents.forEach((agent, idx) => {
          const rowTop = timelineTopMargin + idx * timelineRowHeight;
          const yCenter = rowTop + timelineRowHeight / 2;
          ctx.strokeStyle = "rgba(0, 0, 0, 0.06)"; ctx.beginPath(); ctx.moveTo(0, rowTop + timelineRowHeight); ctx.lineTo(pdfWidth, rowTop + timelineRowHeight); ctx.stroke();
          ctx.fillStyle = "#1e293b"; ctx.font = "600 12px sans-serif"; ctx.textAlign = "left"; ctx.fillText(agent.name, 15, yCenter + 4);
          if (filterGhlUpdates) {
            bstUpdatesList.filter(up => up.agent === agent.name && up.time >= getMinTime() && up.time <= getMaxTime())
              .filter(up => { if (up.module === "NOTE") return filterNotesOnly; if (up.module === "OPPORTUNITY") return filterOppsOnly; if (up.module === "CONTACT") return filterContactsOnly; return false; })
              .forEach(up => { const xVal = getX(up.time.getTime(), pdfWidth); ctx.fillStyle = "#818cf8"; ctx.beginPath(); ctx.arc(xVal, yCenter, 5, 0, 2 * Math.PI); ctx.fill(); });
          }
          if (filterGhlMessages && ghlMessages) {
            ghlMessages.filter(m => m.agent === agent.name && new Date(m.time) >= getMinTime() && new Date(m.time) <= getMaxTime())
              .forEach(msg => { const xVal = getX(new Date(msg.time).getTime(), pdfWidth); ctx.fillStyle = "#38bdf8"; ctx.beginPath(); ctx.arc(xVal, yCenter, 5, 0, 2 * Math.PI); ctx.fill(); });
          }
          if (filterCalls) {
            let calls = bstCallsList.filter(cl => cl.agent === agent.name && cl.time >= getMinTime() && cl.time <= getMaxTime());
            if (filterMissedOnly) calls = calls.filter(cl => cl.status && cl.status.toLowerCase() !== "answered");
            calls.forEach(cl => { const xVal = getX(cl.time.getTime(), pdfWidth); ctx.fillStyle = "#fb923c"; ctx.beginPath(); const s = 5.5; ctx.moveTo(xVal, yCenter - s); ctx.lineTo(xVal - s, yCenter + s - 1); ctx.lineTo(xVal + s, yCenter + s - 1); ctx.closePath(); ctx.fill(); });
          }
        });
        canvasImageSrc = offCanvas.toDataURL("image/png");
      } catch (e) { console.warn("Offscreen canvas failed for DOCX:", e); }
    }

    // Build agents sorted tables data
    const sortedByMargin = [...agents].sort((a, b) => (b.margin_added_today || 0) - (a.margin_added_today || 0));
    const sortedByConverted = [...agents].sort((a, b) => (b.converted_today || 0) - (a.converted_today || 0));
    const sortedByCalls = [...agents].sort((a, b) => {
      const totalA = (a.call_metrics?.outboundCount || 0) + (a.call_metrics?.inboundCount || 0);
      const totalB = (b.call_metrics?.outboundCount || 0) + (b.call_metrics?.inboundCount || 0);
      return totalB - totalA;
    });

    const thStyle = (widthVal) => `style="border: 1px solid #94a3b8; padding: 5px 3px; background: #3c5a78; color: #ffffff; font-weight: bold; font-size: 8pt; text-align: center; width: ${widthVal};"`;
    const tdStyle = 'style="border: 1px solid #cbd5e1; padding: 4px 3px; text-align: center; font-size: 8pt; color: #334155;"';
    const tdNameStyle = 'style="border: 1px solid #cbd5e1; padding: 4px 3px; text-align: center; font-weight: bold; font-size: 8pt; color: #1e293b;"';
    const tdBoldStyle = 'style="border: 1px solid #cbd5e1; padding: 4px 3px; text-align: center; font-weight: bold; font-size: 8pt; color: #0f172a;"';

    const docHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"><title>Agent Performance Report</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <xml>
        <o:OfficeDocumentSettings>
          <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
      </xml>
      <![endif]-->
      <style>
        @page {
          size: 11in 8.5in;
          margin: 0.75in 0.75in 0.75in 0.75in;
        }
        body { font-family: Calibri, Arial, sans-serif; color: #0f172a; font-size: 9.5pt; line-height: 1.35; margin: 0; padding: 0; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 12pt; table-layout: fixed; }
        td, th { word-wrap: break-word; overflow: hidden; }
        h1 { font-size: 15pt; color: #ffffff; background: #1b365d; padding: 12px; text-align: center; margin: 0 0 14pt 0; }
        h2 { font-size: 11pt; color: #1b365d; border-left: 4px solid #1b365d; padding-left: 8px; margin-top: 16pt; margin-bottom: 8pt; text-transform: uppercase; }
        .glossary { border: 1px solid #cbd5e1; background: #f8fafc; padding: 12px; margin-bottom: 14pt; font-size: 8.5pt; border-radius: 4px; }
        .glossary h3 { color: #1b365d; margin: 0 0 6px 0; font-size: 10.5pt; }
      </style></head><body>
      <h1>Agent Performance &amp; Activity Report (${reportDateFormatted})</h1>
      <div class="glossary">
        <h3>Glossary &amp; Metric Definitions</h3>
        <p style="margin:0 0 4px 0;"><b>New Leads:</b> Total count of new leads assigned. | <b>Appt Booked / Booked:</b> Leads converted to appointment/booked status. | <b>Closed:</b> Leads marked closed.</p>
        <p style="margin:0 0 4px 0;"><b>Margin ($):</b> Financial margin added. | <b>Interested / Contacted:</b> Pipeline stage advances. | <b>Notes Updated:</b> CRM notes modified. | <b>Conv. Rate:</b> (Booked ÷ Eligible Base) × 100.</p>
        <p style="margin:0;"><b>Today's Converted &amp; Rate:</b> Leads created today already booked. | <b>OUT/IN Count:</b> Outbound/Inbound call volume. | <b>Attended/Missed:</b> Calls answered vs missed. | <b>MINS/AVG:</b> Talk time and average per call.</p>
      </div>

      <h2>1. Agent Conversion &amp; Lead Metrics</h2>
      <table style="width:100%;">
        <tr>
          <th ${thStyle("14%")}>AGENT</th>
          <th ${thStyle("8%")}>NEW LEADS</th>
          <th ${thStyle("9%")}>REFERRALS</th>
          <th ${thStyle("10%")}>APPT BOOKED</th>
          <th ${thStyle("8%")}>CLOSED</th>
          <th ${thStyle("8%")}>BOOKED</th>
          <th ${thStyle("9%")}>MARGIN</th>
          <th ${thStyle("8%")}>INTERESTED</th>
          <th ${thStyle("8%")}>CONTACTED</th>
          <th ${thStyle("9%")}>NOTES</th>
          <th ${thStyle("9%")}>CONV. RATE</th>
        </tr>
        ${sortedByMargin.map((a, i) => { 
          const seg = a.segmentations || {}; 
          const mv = typeof a.margin_added_today === "number" ? "$" + a.margin_added_today.toFixed(2) : "$0.00"; 
          const bg = i % 2 === 0 ? "#ffffff" : "#f8fafc"; 
          return `<tr style="background:${bg}"><td ${tdNameStyle}>${a.name}</td><td ${tdStyle}>${seg.newLeads || 0}</td><td ${tdStyle}>${seg.referrals || 0}</td><td ${tdStyle}>${seg.apptBookedLeads || 0}</td><td ${tdStyle}>${seg.closedLeads || 0}</td><td ${tdStyle}>${seg.bookedLeads || 0}</td><td ${tdBoldStyle}>${mv}</td><td ${tdStyle}>${a.stage_interested_today || 0}</td><td ${tdStyle}>${a.stage_contacted_today || 0}</td><td ${tdStyle}>${a.notes_updated_today || 0}</td><td ${tdBoldStyle}>${a.general_conv_rate?.toFixed(1) || "0.0"}%</td></tr>`; 
        }).join("")}
      </table>

      <h2>2. Today's (${formattedGlossaryDate}) New Leads Conversion</h2>
      <table style="width:100%;">
        <tr>
          <th ${thStyle("30%")}>AGENT</th>
          <th ${thStyle("17%")}>NEW LEADS TODAY</th>
          <th ${thStyle("18%")}>REFERRALS TODAY</th>
          <th ${thStyle("17%")}>CONVERTED TODAY</th>
          <th ${thStyle("18%")}>CONV. RATE</th>
        </tr>
        ${sortedByConverted.map((a, i) => { 
          const bg = i % 2 === 0 ? "#ffffff" : "#f8fafc"; 
          return `<tr style="background:${bg}"><td ${tdNameStyle}>${a.name}</td><td ${tdStyle}>${a.new_leads_today || 0}</td><td ${tdStyle}>${a.referrals_today || 0}</td><td ${tdStyle}>${a.converted_today || 0}</td><td ${tdBoldStyle}>${a.today_conv_rate?.toFixed(1) || "0.0"}%</td></tr>`; 
        }).join("")}
      </table>

      <h2>3. Detailed Call Metrics (${formattedGlossaryDate} BST)</h2>
      <table style="width:100%;">
        <tr>
          <th ${thStyle("14%")}>AGENT</th>
          <th ${thStyle("8%")}>OUT CNT</th>
          <th ${thStyle("9%")}>OUT ANS</th>
          <th ${thStyle("9%")}>OUT MISS</th>
          <th ${thStyle("10%")}>OUT MINS</th>
          <th ${thStyle("8%")}>OUT AVG</th>
          <th ${thStyle("8%")}>IN CNT</th>
          <th ${thStyle("8%")}>IN ANS</th>
          <th ${thStyle("8%")}>IN MISS</th>
          <th ${thStyle("9%")}>IN MINS</th>
          <th ${thStyle("9%")}>IN AVG</th>
        </tr>
        ${sortedByCalls.map((a, i) => { 
          const c = a.call_metrics || {}; 
          const bg = i % 2 === 0 ? "#ffffff" : "#f8fafc"; 
          return `<tr style="background:${bg}"><td ${tdNameStyle}>${a.name}</td><td ${tdStyle}>${c.outboundCount || 0}</td><td ${tdStyle}>${c.outboundAttended || 0}</td><td ${tdStyle}>${c.outboundMissed || 0}</td><td ${tdStyle}>${c.outboundMinutes?.toFixed(1) || "0.0"}</td><td ${tdStyle}>${c.outboundAvgDuration?.toFixed(1) || "0.0"}</td><td ${tdStyle}>${c.inboundCount || 0}</td><td ${tdStyle}>${c.inboundAttended || 0}</td><td ${tdStyle}>${c.inboundMissed || 0}</td><td ${tdStyle}>${c.inboundMinutes?.toFixed(1) || "0.0"}</td><td ${tdStyle}>${c.inboundAvgDuration?.toFixed(1) || "0.0"}</td></tr>`; 
        }).join("")}
      </table>

      <h2>4. Agent Activity Graph (${startHour.toString().padStart(2, "0")}:00 - ${endHour.toString().padStart(2, "0")}:00 BST)</h2>
      ${canvasImageSrc ? `<div style="border:1.5px solid #cbd5e1; padding: 12px; background: #ffffff; text-align: center; border-radius: 4px;"><img src="${canvasImageSrc}" style="width: 100%; max-width: 100%; height: auto;" /></div>` : `<p style="color: #64748b; font-style: italic;">[Activity graph rendered in PDF only]</p>`}
      </body></html>
    `;

    const blob = new Blob([docHtml], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Agent_Performance_Report_${reportDate}.doc`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadCSV = (headers, rows, filename) => {
    const escapeCell = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    
    const csvContent = "\uFEFF" 
      + [headers.map(escapeCell).join(",")].concat(rows.map(r => r.map(escapeCell).join(","))).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportTable1 = () => {
    const headers = ["Agent", "New Leads", "Referrals", "Appt Booked", "Closed Leads", "Booked Leads", "Margin ($)", "Interested Stage", "Contacted Stage", "Notes Count", "General Conversion (%)"];
    const rows = agents.map(a => {
      const seg = a.segmentations || {};
      return [
        a.name,
        seg.newLeads || 0,
        seg.referrals || 0,
        seg.apptBookedLeads || 0,
        seg.closedLeads || 0,
        seg.bookedLeads || 0,
        a.margin_added_today,
        a.stage_interested_today,
        a.stage_contacted_today,
        a.notes_updated_today,
        a.general_conv_rate.toFixed(1)
      ];
    });
    downloadCSV(headers, rows, "agent_conversion_report.csv");
  };

  const handleExportTable2 = () => {
    const headers = ["Agent", "Today's New Leads", "Today's Referrals", "Today's Converted (Booked/Appt Booked)", "Today's Conversion Rate (%)"];
    const rows = agents.map(a => [
      a.name,
      a.new_leads_today,
      a.referrals_today || 0,
      a.converted_today,
      a.today_conv_rate.toFixed(1)
    ]);
    downloadCSV(headers, rows, "lead_sprints_report.csv");
  };

  const handleExportTable3 = () => {
    const headers = [
      "Agent", 
      "Outbound Calls", "Outbound Answered", "Outbound Missed", "Outbound Total Mins", "Outbound Avg Dur (Mins)",
      "Inbound Calls", "Inbound Answered", "Inbound Missed", "Inbound Total Mins", "Inbound Avg Dur (Mins)"
    ];
    const rows = agents.map(a => {
      const call = a.call_metrics || {};
      return [
        a.name,
        call.outboundCount,
        call.outboundAttended,
        call.outboundMissed,
        call.outboundMinutes.toFixed(1),
        call.outboundAvgDuration.toFixed(1),
        call.inboundCount,
        call.inboundAttended,
        call.inboundMissed,
        call.inboundMinutes.toFixed(1),
        call.inboundAvgDuration.toFixed(1)
      ];
    });
    downloadCSV(headers, rows, "call_analytics_report.csv");
  };

  const showAll = !activeSection || activeSection === "executive-report";
  const formattedGlossaryDate = new Date(reportDate).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

  return (
    <div id="executive-report-content" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* 1. Header (hidden during printing if we are printing specific tables) */}
      <div className="card no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.5rem" }}>
        <div>
          <h2 style={{ margin: 0 }}>
            <i className="fa-solid fa-file-invoice"></i> Executive Operations Report - {new Date(reportDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })}
          </h2>
          <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{timezone === "PKT" ? "PKT (Pakistan Standard Time)" : "BST (British Summer Time)"} standard timezone analysis</span>
        </div>
        {activeSection !== "exec-export" && (
          <div style={{ display: "flex", gap: "0.6rem" }}>
            <button className="btn-primary-small" onClick={handlePrint}>
              <i className="fa-solid fa-print"></i> Print Full PDF
            </button>
          </div>
        )}
      </div>

      {/* 2. Glossary & Descriptions */}
      {(showAll || activeSection === "exec-conversion" || activeSection === "exec-sprints") && (
        <section className="card">
          <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.5rem" }}>Report Glossary & Calculations</h3>
          <ul style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "0.75rem", paddingLeft: "1.25rem" }}>
            <li>
              <strong>Eligible Interacted Base:</strong> (Total Opportunity Leads - Closed Leads - Appointment Booked Leads). Reflects true conversion pipeline.
            </li>
            <li>
              <strong>General Conversion Rate:</strong> (Booked Leads &divide; Eligible Interacted Base) &times; 100.
            </li>
            <li>
              <strong>Today's Conversion Rate:</strong> ({formattedGlossaryDate} Converted &divide; {formattedGlossaryDate} Created New Leads) &times; 100.
            </li>
            <li>
              <strong>Stage Advancements:</strong> Pipeline movements to <em>'Interested'</em> and <em>'Contacted'</em>.
            </li>
          </ul>
        </section>
      )}

      {/* 3. Scatter timeline chart */}
      {(showAll || activeSection === "exec-timeline") && (
        <section className="card">
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <h2 style={{ margin: 0 }}>
              <i className="fa-solid fa-timeline"></i> Visual Scatter Workday Timeline ({startHour.toString().padStart(2, "0")}:00 - {endHour.toString().padStart(2, "0")}:00 BST)
            </h2>
            
            {/* Filters */}
            <div className="no-print" style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
              {/* Agent Multi-Select Checkbox Dropdown */}
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setShowAgentDropdown(!showAgentDropdown)}
                  className="custom-select-small"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.4rem 1.8rem 0.4rem 0.85rem",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    borderRadius: "6px",
                    background: "var(--input-bg)",
                    border: "1px solid var(--input-border)",
                    color: "var(--text-primary)",
                    cursor: "pointer"
                  }}
                >
                  <i className="fa-solid fa-users" style={{ color: "var(--primary)" }}></i>
                  Agents ({selectedAgents.length === agents.length ? "All" : selectedAgents.length})
                </button>
                {showAgentDropdown && (
                  <>
                    <div 
                      onClick={() => setShowAgentDropdown(false)} 
                      style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }}
                    />
                    <div 
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        marginTop: "0.5rem",
                        background: "var(--card-bg)",
                        border: "1px solid var(--card-border)",
                        borderRadius: "8px",
                        padding: "0.75rem",
                        width: "220px",
                        maxHeight: "260px",
                        overflowY: "auto",
                        zIndex: 999,
                        boxShadow: "var(--shadow)"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "0.4rem", marginBottom: "0.4rem" }}>
                        <button 
                          onClick={() => setSelectedAgents(agents.map(a => a.name))} 
                          style={{ background: "none", border: "none", color: "var(--primary)", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}
                        >
                          Select All
                        </button>
                        <button 
                          onClick={() => setSelectedAgents([])} 
                          style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}
                        >
                          Clear All
                        </button>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                        {agents.map((a) => (
                          <label key={a.name} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", color: "var(--text-primary)", cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={selectedAgents.includes(a.name)}
                              onChange={() => {
                                if (selectedAgents.includes(a.name)) {
                                  setSelectedAgents(selectedAgents.filter(x => x !== a.name));
                                } else {
                                  setSelectedAgents([...selectedAgents, a.name]);
                                }
                              }}
                              style={{ cursor: "pointer", accentColor: "var(--primary)" }}
                            />
                            {a.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Time bounds Start & End Picker */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)" }}>Bounds:</span>
                <select
                  value={startHour}
                  onChange={(e) => {
                    const newStart = parseInt(e.target.value);
                    setStartHour(newStart);
                    if (endHour <= newStart) setEndHour(newStart + 1);
                  }}
                  style={{ padding: "0.3rem 1.8rem 0.3rem 0.6rem", fontSize: "0.8rem", borderRadius: "6px" }}
                >
                  {Array.from({ length: 24 }).map((_, h) => (
                    <option key={h} value={h}>{h.toString().padStart(2, "0")}:00 BST</option>
                  ))}
                </select>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>to</span>
                <select
                  value={endHour}
                  onChange={(e) => setEndHour(parseInt(e.target.value))}
                  style={{ padding: "0.3rem 1.8rem 0.3rem 0.6rem", fontSize: "0.8rem", borderRadius: "6px" }}
                >
                  {Array.from({ length: 24 }).map((_, h) => (
                    <option key={h} value={h} disabled={h <= startHour}>{h.toString().padStart(2, "0")}:00 BST</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Interactive Checkbox Event Filter Panel */}
          <div className="no-print" style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center", width: "100%", padding: "0.75rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.03)", background: "rgba(255,255,255,0.01)" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)" }}>Show Timeline Data:</span>
            
            {/* GHL Checkbox */}
            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={filterGhlUpdates}
                onChange={() => setFilterGhlUpdates(!filterGhlUpdates)}
                style={{ accentColor: "#818cf8", cursor: "pointer" }}
              />
              <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#818cf8" }} />
              GHL Updates
            </label>

            {/* GHL Messages Checkbox */}
            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={filterGhlMessages}
                onChange={() => setFilterGhlMessages(!filterGhlMessages)}
                style={{ accentColor: "#38bdf8", cursor: "pointer" }}
              />
              <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#38bdf8" }} />
              GHL Messages
            </label>

            {filterGhlUpdates && (
              <div style={{ display: "flex", gap: "0.8rem", paddingLeft: "0.5rem", borderLeft: "1px solid rgba(255,255,255,0.1)", flexWrap: "wrap" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem", color: "var(--text-secondary)", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={filterNotesOnly}
                    onChange={() => setFilterNotesOnly(!filterNotesOnly)}
                    style={{ accentColor: "var(--primary)", cursor: "pointer" }}
                  />
                  Notes
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem", color: "var(--text-secondary)", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={filterOppsOnly}
                    onChange={() => setFilterOppsOnly(!filterOppsOnly)}
                    style={{ accentColor: "var(--primary)", cursor: "pointer" }}
                  />
                  Opportunities
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem", color: "var(--text-secondary)", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={filterContactsOnly}
                    onChange={() => setFilterContactsOnly(!filterContactsOnly)}
                    style={{ accentColor: "var(--primary)", cursor: "pointer" }}
                  />
                  Contacts
                </label>
              </div>
            )}

            {/* Calls Checkbox */}
            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)", cursor: "pointer", marginLeft: "0.5rem" }}>
              <input
                type="checkbox"
                checked={filterCalls}
                onChange={() => setFilterCalls(!filterCalls)}
                style={{ accentColor: "#fb923c", cursor: "pointer" }}
              />
              <span style={{ display: "inline-block", width: 0, height: 0, borderBottom: "8px solid #fb923c", borderLeft: "5px solid transparent", borderRight: "5px solid transparent" }} />
              Call Events
            </label>

            {filterCalls && (
              <div style={{ display: "flex", gap: "0.8rem", paddingLeft: "0.5rem", borderLeft: "1px solid rgba(255,255,255,0.1)" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem", color: "var(--text-secondary)", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={filterMissedOnly}
                    onChange={() => setFilterMissedOnly(!filterMissedOnly)}
                    style={{ accentColor: "var(--primary)", cursor: "pointer" }}
                  />
                  Missed Calls Only
                </label>
              </div>
            )}
          </div>

          <div className="no-print text-secondary" style={{ padding: "0.5rem 1.5rem", fontSize: "0.78rem", borderBottom: "1px solid rgba(255,255,255,0.03)", fontStyle: "italic" }}>
            <i className="fa-solid fa-circle-info" style={{ color: "var(--primary)", marginRight: "0.3rem" }}></i> 
            Click on any GHL circle or Call triangle in the timeline to inspect detailed action parameters.
          </div>

          <div 
            className="timeline-container-outer" 
            ref={containerRef}
            style={{ overflowX: "auto", overflowY: "hidden", width: "100%", WebkitOverflowScrolling: "touch" }}
          >
            <div className="timeline-container" style={{ minWidth: "900px" }}>
              <canvas
                ref={canvasRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={handleCanvasClick}
                style={{ cursor: hoveredItem ? "pointer" : "default", display: "block" }}
              />
            </div>
          </div>

          {/* Interactive Event Detail Inspector */}
          {selectedEvent && (
            <div className="no-print" style={{ margin: "0.5rem 1.5rem 1.5rem", padding: "1.25rem", borderRadius: "8px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "0.5rem", marginBottom: "0.75rem" }}>
                <h4 style={{ margin: 0, fontSize: "0.92rem", fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <i className={selectedEvent.type === "update" ? "fa-solid fa-cube" : "fa-solid fa-phone"}></i> Action Detail Inspector
                </h4>
                <button
                  onClick={() => setSelectedEvent(null)}
                  style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "1.2rem", fontWeight: 700 }}
                >
                  &times;
                </button>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", fontSize: "0.85rem" }}>
                <div>
                  <span style={{ color: "var(--text-secondary)", display: "block", fontSize: "0.75rem", fontWeight: 700, marginBottom: "2px" }}>AGENT</span>
                  <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{selectedEvent.agent}</span>
                </div>
                <div>
                  <span style={{ color: "var(--text-secondary)", display: "block", fontSize: "0.75rem", fontWeight: 700, marginBottom: "2px" }}>EVENT TYPE</span>
                  <span style={{ fontWeight: 700, color: selectedEvent.type === "message" ? "#38bdf8" : (selectedEvent.type === "update" ? "#818cf8" : "#fb923c") }}>
                    {selectedEvent.type === "message" ? "GHL Outbound Message" : (selectedEvent.type === "update" ? "GHL Update Log" : "Phone Call Event")}
                  </span>
                </div>
                <div>
                  <span style={{ color: "var(--text-secondary)", display: "block", fontSize: "0.75rem", fontWeight: 700, marginBottom: "2px" }}>TIMESTAMP</span>
                  <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                    {new Date(selectedEvent.time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })} BST
                  </span>
                </div>
                {selectedEvent.type === "call" && (
                  <>
                    <div>
                      <span style={{ color: "var(--text-secondary)", display: "block", fontSize: "0.75rem", fontWeight: 700, marginBottom: "2px" }}>DIRECTION</span>
                      <span style={{ fontWeight: 700, textTransform: "capitalize", color: "var(--text-primary)" }}>{selectedEvent.data.direction}</span>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-secondary)", display: "block", fontSize: "0.75rem", fontWeight: 700, marginBottom: "2px" }}>STATUS / OUTCOME</span>
                      <span style={{ fontWeight: 700, color: selectedEvent.data.status.toLowerCase() === "answered" ? "var(--success)" : "var(--danger)" }}>
                        {selectedEvent.data.status}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-secondary)", display: "block", fontSize: "0.75rem", fontWeight: 700, marginBottom: "2px" }}>DURATION</span>
                      <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{selectedEvent.data.duration}</span>
                    </div>
                  </>
                )}
                {selectedEvent.type === "update" && (
                  <>
                    <div>
                      <span style={{ color: "var(--text-secondary)", display: "block", fontSize: "0.75rem", fontWeight: 700, marginBottom: "2px" }}>CRM MODULE</span>
                      <span style={{ fontWeight: 700, color: "var(--info)" }}>{selectedEvent.data.module}</span>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-secondary)", display: "block", fontSize: "0.75rem", fontWeight: 700, marginBottom: "2px" }}>CRM ACTION</span>
                      <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{selectedEvent.data.action}</span>
                    </div>
                  </>
                )}
                {selectedEvent.type === "message" && (
                  <>
                    <div>
                      <span style={{ color: "var(--text-secondary)", display: "block", fontSize: "0.75rem", fontWeight: 700, marginBottom: "2px" }}>RECIPIENT (CONTACT)</span>
                      <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{selectedEvent.data.contactName}</span>
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                      <span style={{ color: "var(--text-secondary)", display: "block", fontSize: "0.75rem", fontWeight: 700, marginBottom: "2px" }}>MESSAGE BODY</span>
                      <span style={{ fontWeight: 700, color: "var(--text-primary)", fontStyle: "italic", whiteSpace: "normal" }}>"{selectedEvent.data.body}"</span>
                    </div>
                  </>
                )}
              </div>

              {selectedEvent.data.details && (
                <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <span style={{ color: "var(--text-secondary)", display: "block", fontSize: "0.75rem", fontWeight: 700, marginBottom: "0.5rem" }}>ACTION DESCRIPTION DETAILS (FORMATTED)</span>
                  {renderFormattedDetails(selectedEvent.data.details)}
                </div>
              )}
            </div>
          )}

          {hoveredItem && (
            <div className="tooltip" style={{ left: `${hoveredItem.x + 15}px`, top: `${hoveredItem.y + 15}px`, display: "flex", opacity: 1, maxWidth: "320px", flexDirection: "column" }}>
              <div className="tooltip-title" style={{ fontWeight: 800 }}>{hoveredItem.agent}</div>
              <div className="tooltip-row">
                <span className="tooltip-label">Type:</span>
                <span className="tooltip-value" style={{ color: hoveredItem.type === "message" ? "#38bdf8" : (hoveredItem.type === "update" ? "#818cf8" : "#fb923c") }}>
                  {hoveredItem.type === "message" ? "GHL Outbound Message" : (hoveredItem.type === "update" ? "GHL Update" : "Call Event")}
                </span>
              </div>
              <div className="tooltip-row">
                <span className="tooltip-label">Event:</span>
                <span className="tooltip-value">{hoveredItem.label}</span>
              </div>
              <div className="tooltip-row">
                <span className="tooltip-label">Time:</span>
                <span className="tooltip-value">{formatBSTTime(hoveredItem.time)} BST</span>
              </div>
              {hoveredItem.type === "message" && hoveredItem.data?.body && (
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", marginTop: "6px", paddingTop: "6px", fontSize: "0.75rem", color: "#e2e8f0", fontStyle: "italic", whiteSpace: "normal", wordBreak: "break-word", lineHeight: "1.3" }}>
                  "{hoveredItem.data.body}"
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* 4. Table 1: Main Conversion */}
      {(showAll || activeSection === "exec-conversion") && (
        <section className="card">
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <h2 style={{ margin: 0 }}>Table 1: Main Agent Conversion & Lead Metrics</h2>
            
            {/* Table Controls (Selective Agents and Columns) */}
            <div className="no-print" style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
              {/* Selective Agents checklist */}
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => toggleDropdown("table1Agents")}
                  className="custom-select-small"
                  style={{ display: "flex", alignItems: "center", gap: "0.3rem", padding: "0.3rem 1.6rem 0.3rem 0.6rem", fontSize: "0.75rem", borderRadius: "6px" }}
                >
                  <i className="fa-solid fa-user-gear"></i> Rows ({table1Agents.length})
                </button>
                {activeDropdown === "table1Agents" && (
                  <>
                    <div onClick={closeDropdowns} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }} />
                    <div style={{ position: "absolute", right: 0, top: "100%", marginTop: "0.4rem", background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "8px", padding: "0.6rem", width: "180px", maxHeight: "200px", overflowY: "auto", zIndex: 999, boxShadow: "var(--shadow)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "0.3rem", marginBottom: "0.3rem" }}>
                        <button onClick={() => setTable1Agents(agents.map(a => a.name))} style={{ background: "none", border: "none", color: "var(--primary)", fontSize: "0.68rem", fontWeight: 700, cursor: "pointer" }}>All</button>
                        <button onClick={() => setTable1Agents([])} style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: "0.68rem", fontWeight: 700, cursor: "pointer" }}>Clear</button>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                        {agents.map(a => (
                          <label key={a.name} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "var(--text-primary)", cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={table1Agents.includes(a.name)}
                              onChange={() => {
                                if (table1Agents.includes(a.name)) {
                                  setTable1Agents(table1Agents.filter(x => x !== a.name));
                                } else {
                                  setTable1Agents([...table1Agents, a.name]);
                                }
                              }}
                              style={{ cursor: "pointer", accentColor: "var(--primary)" }}
                            />
                            {a.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Column checklist selector */}
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => toggleDropdown("table1Cols")}
                  className="custom-select-small"
                  style={{ display: "flex", alignItems: "center", gap: "0.3rem", padding: "0.3rem 1.6rem 0.3rem 0.6rem", fontSize: "0.75rem", borderRadius: "6px" }}
                >
                  <i className="fa-solid fa-table-columns"></i> Columns ({table1VisibleCols.length})
                </button>
                {activeDropdown === "table1Cols" && (
                  <>
                    <div onClick={closeDropdowns} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }} />
                    <div style={{ position: "absolute", right: 0, top: "100%", marginTop: "0.4rem", background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "8px", padding: "0.6rem", width: "200px", maxHeight: "250px", overflowY: "auto", zIndex: 999, boxShadow: "var(--shadow)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "0.3rem", marginBottom: "0.3rem" }}>
                        <button onClick={() => setTable1VisibleCols(table1ColumnsMetadata.map(c => c.key))} style={{ background: "none", border: "none", color: "var(--primary)", fontSize: "0.68rem", fontWeight: 700, cursor: "pointer" }}>All</button>
                        <button onClick={() => setTable1VisibleCols([])} style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: "0.68rem", fontWeight: 700, cursor: "pointer" }}>Clear</button>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                        {table1ColumnsMetadata.map(c => (
                          <label key={c.key} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "var(--text-primary)", cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={table1VisibleCols.includes(c.key)}
                              onChange={() => {
                                if (table1VisibleCols.includes(c.key)) {
                                  setTable1VisibleCols(table1VisibleCols.filter(x => x !== c.key));
                                } else {
                                  setTable1VisibleCols([...table1VisibleCols, c.key]);
                                }
                              }}
                              style={{ cursor: "pointer", accentColor: "var(--primary)" }}
                            />
                            {c.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <button className="btn-primary-small no-print" onClick={handleExportTable1}>
                <i className="fa-solid fa-file-excel"></i> Export Table 1
              </button>
            </div>
          </div>
          
          <div className="table-container">
            <table className="print-table">
              <thead>
                <tr>
                  <th>Agent</th>
                  {table1VisibleCols.includes("newLeads") && <th style={{ backgroundColor: "rgba(56, 189, 248, 0.08)", color: "#38bdf8" }}>New Leads</th>}
                  {table1VisibleCols.includes("referrals") && <th style={{ backgroundColor: "rgba(129, 140, 248, 0.08)", color: "#818cf8" }}>Ref</th>}
                  {table1VisibleCols.includes("apptBooked") && <th style={{ backgroundColor: "rgba(201, 179, 54, 0.08)", color: "var(--warning)" }}>Appt</th>}
                  {table1VisibleCols.includes("closedLeads") && <th style={{ backgroundColor: "rgba(239, 68, 68, 0.08)", color: "var(--danger)" }}>Closed</th>}
                  {table1VisibleCols.includes("bookedLeads") && <th style={{ backgroundColor: "rgba(113, 167, 88, 0.08)", color: "var(--success)" }}>Booked</th>}
                  {table1VisibleCols.includes("margin") && <th style={{ backgroundColor: "rgba(113, 167, 88, 0.08)", color: "var(--success)" }}>Margin</th>}
                  {table1VisibleCols.includes("interested") && <th>Interest</th>}
                  {table1VisibleCols.includes("contacted") && <th>Contact</th>}
                  {table1VisibleCols.includes("notes") && <th>Notes</th>}
                  {table1VisibleCols.includes("generalConv") && <th>Conv %</th>}
                </tr>
              </thead>
              <tbody>
                {agents.filter(a => table1Agents.includes(a.name)).map((a) => {
                  const seg = a.segmentations || {};
                  return (
                    <tr key={a.name}>
                      <td style={{ fontWeight: 700 }}>{a.name}</td>
                      
                      {table1VisibleCols.includes("newLeads") && (
                        <td style={{ backgroundColor: "rgba(56, 189, 248, 0.02)", fontWeight: 600 }}>{seg.newLeads || 0}</td>
                      )}
                      {table1VisibleCols.includes("referrals") && (
                        <td style={{ backgroundColor: "rgba(129, 140, 248, 0.02)", color: "#818cf8", fontWeight: 600 }}>{seg.referrals || 0}</td>
                      )}
                      {table1VisibleCols.includes("apptBooked") && (
                        <td style={{ backgroundColor: "rgba(201, 179, 54, 0.02)", color: "var(--warning)", fontWeight: 700 }}>{seg.apptBookedLeads || 0}</td>
                      )}
                      {table1VisibleCols.includes("closedLeads") && (
                        <td style={{ backgroundColor: "rgba(239, 68, 68, 0.02)", color: "var(--danger)", fontWeight: 700 }}>{seg.closedLeads || 0}</td>
                      )}
                      {table1VisibleCols.includes("bookedLeads") && (
                        <td style={{ backgroundColor: "rgba(113, 167, 88, 0.02)", color: "var(--success)", fontWeight: 700 }}>{seg.bookedLeads || 0}</td>
                      )}
                      {table1VisibleCols.includes("margin") && (
                        <td style={{ backgroundColor: "rgba(113, 167, 88, 0.02)", fontWeight: 700, color: "var(--success)" }}>
                          ${a.margin_added_today.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      )}
                      {table1VisibleCols.includes("interested") && <td>{a.stage_interested_today}</td>}
                      {table1VisibleCols.includes("contacted") && <td>{a.stage_contacted_today}</td>}
                      {table1VisibleCols.includes("notes") && <td>{a.notes_updated_today}</td>}
                      {table1VisibleCols.includes("generalConv") && <td style={{ fontWeight: 700 }}>{a.general_conv_rate.toFixed(1)}%</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 5. Table 2: Conversion Sprints */}
      {(showAll || activeSection === "exec-sprints") && (
        <section className="card">
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <h2 style={{ margin: 0 }}>Table 2: Today's ({formattedGlossaryDate}) New Leads Conversion Sprints</h2>
            
            {/* Table 2 controls */}
            <div className="no-print" style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
              {/* Table 2 Row checklist */}
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => toggleDropdown("table2Agents")}
                  className="custom-select-small"
                  style={{ display: "flex", alignItems: "center", gap: "0.3rem", padding: "0.3rem 1.6rem 0.3rem 0.6rem", fontSize: "0.75rem", borderRadius: "6px" }}
                >
                  <i className="fa-solid fa-user-gear"></i> Rows ({table2Agents.length})
                </button>
                {activeDropdown === "table2Agents" && (
                  <>
                    <div onClick={closeDropdowns} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }} />
                    <div style={{ position: "absolute", right: 0, top: "100%", marginTop: "0.4rem", background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "8px", padding: "0.6rem", width: "180px", maxHeight: "200px", overflowY: "auto", zIndex: 999, boxShadow: "var(--shadow)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "0.3rem", marginBottom: "0.3rem" }}>
                        <button onClick={() => setTable2Agents(agents.map(a => a.name))} style={{ background: "none", border: "none", color: "var(--primary)", fontSize: "0.68rem", fontWeight: 700, cursor: "pointer" }}>All</button>
                        <button onClick={() => setTable2Agents([])} style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: "0.68rem", fontWeight: 700, cursor: "pointer" }}>Clear</button>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                        {agents.map(a => (
                          <label key={a.name} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "var(--text-primary)", cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={table2Agents.includes(a.name)}
                              onChange={() => {
                                if (table2Agents.includes(a.name)) {
                                  setTable2Agents(table2Agents.filter(x => x !== a.name));
                                } else {
                                  setTable2Agents([...table2Agents, a.name]);
                                }
                              }}
                              style={{ cursor: "pointer", accentColor: "var(--primary)" }}
                            />
                            {a.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Table 2 Columns checklist */}
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => toggleDropdown("table2Cols")}
                  className="custom-select-small"
                  style={{ display: "flex", alignItems: "center", gap: "0.3rem", padding: "0.3rem 1.6rem 0.3rem 0.6rem", fontSize: "0.75rem", borderRadius: "6px" }}
                >
                  <i className="fa-solid fa-table-columns"></i> Columns ({table2VisibleCols.length})
                </button>
                {activeDropdown === "table2Cols" && (
                  <>
                    <div onClick={closeDropdowns} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }} />
                    <div style={{ position: "absolute", right: 0, top: "100%", marginTop: "0.4rem", background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "8px", padding: "0.6rem", width: "200px", maxHeight: "200px", overflowY: "auto", zIndex: 999, boxShadow: "var(--shadow)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "0.3rem", marginBottom: "0.3rem" }}>
                        <button onClick={() => setTable2VisibleCols(table2ColumnsMetadata.map(c => c.key))} style={{ background: "none", border: "none", color: "var(--primary)", fontSize: "0.68rem", fontWeight: 700, cursor: "pointer" }}>All</button>
                        <button onClick={() => setTable2VisibleCols([])} style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: "0.68rem", fontWeight: 700, cursor: "pointer" }}>Clear</button>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                        {table2ColumnsMetadata.map(c => (
                          <label key={c.key} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "var(--text-primary)", cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={table2VisibleCols.includes(c.key)}
                              onChange={() => {
                                if (table2VisibleCols.includes(c.key)) {
                                  setTable2VisibleCols(table2VisibleCols.filter(x => x !== c.key));
                                } else {
                                  setTable2VisibleCols([...table2VisibleCols, c.key]);
                                }
                              }}
                              style={{ cursor: "pointer", accentColor: "var(--primary)" }}
                            />
                            {c.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <button className="btn-primary-small no-print" onClick={handleExportTable2}>
                <i className="fa-solid fa-file-excel"></i> Export Table 2
              </button>
            </div>
          </div>
          <div className="table-container">
            <table className="print-table">
              <thead>
                <tr>
                  <th>Agent</th>
                  {table2VisibleCols.includes("newLeadsToday") && <th style={{ backgroundColor: "rgba(56, 189, 248, 0.08)", color: "#38bdf8" }}>Today's New Leads</th>}
                  {table2VisibleCols.includes("referralsToday") && <th style={{ backgroundColor: "rgba(129, 140, 248, 0.08)", color: "#818cf8" }}>Today's Referrals</th>}
                  {table2VisibleCols.includes("convertedToday") && <th style={{ backgroundColor: "rgba(113, 167, 88, 0.08)", color: "var(--success)" }}>Today's Converted (Booked/Appt Booked)</th>}
                  {table2VisibleCols.includes("todayConvRate") && <th style={{ backgroundColor: "rgba(201, 179, 54, 0.08)", color: "var(--warning)" }}>Today's Conversion Rate (%)</th>}
                </tr>
              </thead>
              <tbody>
                {agents.filter(a => table2Agents.includes(a.name)).map((a) => (
                  <tr key={a.name}>
                    <td style={{ fontWeight: 700 }}>{a.name}</td>
                    {table2VisibleCols.includes("newLeadsToday") && (
                      <td style={{ backgroundColor: "rgba(56, 189, 248, 0.02)" }}>{a.new_leads_today}</td>
                    )}
                    {table2VisibleCols.includes("referralsToday") && (
                      <td style={{ backgroundColor: "rgba(129, 140, 248, 0.02)", color: "#818cf8", fontWeight: 600 }}>{a.referrals_today || 0}</td>
                    )}
                    {table2VisibleCols.includes("convertedToday") && (
                      <td style={{ backgroundColor: "rgba(113, 167, 88, 0.02)", color: "var(--success)", fontWeight: 700 }}>{a.converted_today}</td>
                    )}
                    {table2VisibleCols.includes("todayConvRate") && (
                      <td style={{ backgroundColor: "rgba(201, 179, 54, 0.02)", fontWeight: 700, color: "var(--primary)" }}>{a.today_conv_rate.toFixed(1)}%</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 6. Table 3: Call Metrics */}
      {(showAll || activeSection === "exec-calls") && (
        <section className="card">
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h2 style={{ margin: 0 }}>Table 3: Granular Inbound vs. Outbound Call Metrics</h2>
              <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)", marginTop: "0.3rem", display: "flex", gap: "0.8rem", flexWrap: "wrap", fontWeight: 550 }}>
                <span><strong>OUT:</strong> Outbound</span>
                <span><strong>IN:</strong> Inbound</span>
                <span><strong>MINS:</strong> Minutes</span>
                <span><strong>AVG DUR:</strong> Avg Duration</span>
                <span><strong>ANS:</strong> Answered</span>
                <span><strong>MISS:</strong> Missed</span>
              </div>
            </div>
            
            {/* Table 3 controls */}
            <div className="no-print" style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
              {/* Table 3 Agent checklist */}
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => toggleDropdown("table3Agents")}
                  className="custom-select-small"
                  style={{ display: "flex", alignItems: "center", gap: "0.3rem", padding: "0.3rem 1.6rem 0.3rem 0.6rem", fontSize: "0.75rem", borderRadius: "6px" }}
                >
                  <i className="fa-solid fa-user-gear"></i> Rows ({table3Agents.length})
                </button>
                {activeDropdown === "table3Agents" && (
                  <>
                    <div onClick={closeDropdowns} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }} />
                    <div style={{ position: "absolute", right: 0, top: "100%", marginTop: "0.4rem", background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "8px", padding: "0.6rem", width: "180px", maxHeight: "200px", overflowY: "auto", zIndex: 999, boxShadow: "var(--shadow)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "0.3rem", marginBottom: "0.3rem" }}>
                        <button onClick={() => setTable3Agents(agents.map(a => a.name))} style={{ background: "none", border: "none", color: "var(--primary)", fontSize: "0.68rem", fontWeight: 700, cursor: "pointer" }}>All</button>
                        <button onClick={() => setTable3Agents([])} style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: "0.68rem", fontWeight: 700, cursor: "pointer" }}>Clear</button>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                        {agents.map(a => (
                          <label key={a.name} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "var(--text-primary)", cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={table3Agents.includes(a.name)}
                              onChange={() => {
                                if (table3Agents.includes(a.name)) {
                                  setTable3Agents(table3Agents.filter(x => x !== a.name));
                                } else {
                                  setTable3Agents([...table3Agents, a.name]);
                                }
                              }}
                              style={{ cursor: "pointer", accentColor: "var(--primary)" }}
                            />
                            {a.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Table 3 Columns checklist */}
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => toggleDropdown("table3Cols")}
                  className="custom-select-small"
                  style={{ display: "flex", alignItems: "center", gap: "0.3rem", padding: "0.3rem 1.6rem 0.3rem 0.6rem", fontSize: "0.75rem", borderRadius: "6px" }}
                >
                  <i className="fa-solid fa-table-columns"></i> Columns ({table3VisibleCols.length})
                </button>
                {activeDropdown === "table3Cols" && (
                  <>
                    <div onClick={closeDropdowns} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }} />
                    <div style={{ position: "absolute", right: 0, top: "100%", marginTop: "0.4rem", background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "8px", padding: "0.6rem", width: "200px", maxHeight: "250px", overflowY: "auto", zIndex: 999, boxShadow: "var(--shadow)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "0.3rem", marginBottom: "0.3rem" }}>
                        <button onClick={() => setTable3VisibleCols(table3ColumnsMetadata.map(c => c.key))} style={{ background: "none", border: "none", color: "var(--primary)", fontSize: "0.68rem", fontWeight: 700, cursor: "pointer" }}>All</button>
                        <button onClick={() => setTable3VisibleCols([])} style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: "0.68rem", fontWeight: 700, cursor: "pointer" }}>Clear</button>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                        {table3ColumnsMetadata.map(c => (
                          <label key={c.key} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "var(--text-primary)", cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={table3VisibleCols.includes(c.key)}
                              onChange={() => {
                                if (table3VisibleCols.includes(c.key)) {
                                  setTable3VisibleCols(table3VisibleCols.filter(x => x !== c.key));
                                } else {
                                  setTable3VisibleCols([...table3VisibleCols, c.key]);
                                }
                              }}
                              style={{ cursor: "pointer", accentColor: "var(--primary)" }}
                            />
                            {c.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <button className="btn-primary-small no-print" onClick={handleExportTable3}>
                <i className="fa-solid fa-file-excel"></i> Export Table 3
              </button>
            </div>
          </div>
          <div className="table-container">
            <table className="print-table table-compact">
              <thead>
                <tr>
                  <th style={{ minWidth: "130px" }}>Agent</th>
                  {table3VisibleCols.includes("outboundCount") && (
                    <th style={{ backgroundColor: "rgba(219, 131, 36, 0.08)", color: "#fb923c", whiteSpace: "nowrap" }}>
                      OUT CNT
                    </th>
                  )}
                  {table3VisibleCols.includes("outboundAttended") && (
                    <th style={{ backgroundColor: "rgba(113, 167, 88, 0.08)", color: "var(--success)", whiteSpace: "nowrap" }}>
                      OUT ANS
                    </th>
                  )}
                  {table3VisibleCols.includes("outboundMissed") && (
                    <th style={{ backgroundColor: "rgba(239, 68, 68, 0.08)", color: "var(--danger)", whiteSpace: "nowrap" }}>
                      OUT MISS
                    </th>
                  )}
                  {table3VisibleCols.includes("outboundMinutes") && (
                    <th style={{ backgroundColor: "rgba(219, 131, 36, 0.08)", color: "#fb923c", whiteSpace: "nowrap" }}>
                      OUT MINS
                    </th>
                  )}
                  {table3VisibleCols.includes("outboundAvgDuration") && (
                    <th style={{ backgroundColor: "rgba(219, 131, 36, 0.08)", color: "#fb923c", whiteSpace: "nowrap" }}>
                      OUT AVG
                    </th>
                  )}
                  {table3VisibleCols.includes("inboundCount") && (
                    <th style={{ backgroundColor: "rgba(113, 167, 88, 0.08)", color: "var(--success)", whiteSpace: "nowrap" }}>
                      IN CNT
                    </th>
                  )}
                  {table3VisibleCols.includes("inboundAttended") && (
                    <th style={{ backgroundColor: "rgba(113, 167, 88, 0.08)", color: "var(--success)", whiteSpace: "nowrap" }}>
                      IN ANS
                    </th>
                  )}
                  {table3VisibleCols.includes("inboundMissed") && (
                    <th style={{ backgroundColor: "rgba(239, 68, 68, 0.08)", color: "var(--danger)", whiteSpace: "nowrap" }}>
                      IN MISS
                    </th>
                  )}
                  {table3VisibleCols.includes("inboundMinutes") && (
                    <th style={{ backgroundColor: "rgba(113, 167, 88, 0.08)", color: "var(--success)", whiteSpace: "nowrap" }}>
                      IN MINS
                    </th>
                  )}
                  {table3VisibleCols.includes("inboundAvgDuration") && (
                    <th style={{ backgroundColor: "rgba(113, 167, 88, 0.08)", color: "var(--success)", whiteSpace: "nowrap" }}>
                      IN AVG
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {agents.filter(a => table3Agents.includes(a.name)).map((a) => {
                  const call = a.call_metrics || {};
                  return (
                    <tr key={a.name}>
                      <td style={{ fontWeight: 700 }}>{a.name}</td>
                      {/* Outbound */}
                      {table3VisibleCols.includes("outboundCount") && <td>{call.outboundCount}</td>}
                      {table3VisibleCols.includes("outboundAttended") && (
                        <td style={{ backgroundColor: "rgba(113, 167, 88, 0.02)", color: "var(--success)", fontWeight: 600 }}>{call.outboundAttended}</td>
                      )}
                      {table3VisibleCols.includes("outboundMissed") && (
                        <td style={{ backgroundColor: "rgba(239, 68, 68, 0.02)", color: "var(--danger)", fontWeight: 600 }}>{call.outboundMissed}</td>
                      )}
                      {table3VisibleCols.includes("outboundMinutes") && <td>{call.outboundMinutes.toFixed(1)}</td>}
                      {table3VisibleCols.includes("outboundAvgDuration") && <td style={{ fontWeight: 600 }}>{call.outboundAvgDuration.toFixed(1)}</td>}
                      
                      {/* Inbound */}
                      {table3VisibleCols.includes("inboundCount") && <td>{call.inboundCount}</td>}
                      {table3VisibleCols.includes("inboundAttended") && (
                        <td style={{ backgroundColor: "rgba(113, 167, 88, 0.02)", color: "var(--success)", fontWeight: 600 }}>{call.inboundAttended}</td>
                      )}
                      {table3VisibleCols.includes("inboundMissed") && (
                        <td style={{ backgroundColor: "rgba(239, 68, 68, 0.02)", color: "var(--danger)", fontWeight: 600 }}>{call.inboundMissed}</td>
                      )}
                      {table3VisibleCols.includes("inboundMinutes") && <td>{call.inboundMinutes.toFixed(1)}</td>}
                      {table3VisibleCols.includes("inboundAvgDuration") && <td style={{ fontWeight: 600 }}>{call.inboundAvgDuration.toFixed(1)}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 7. Export Centre (PDF + Excel Exports) */}
      {activeSection === "exec-export" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <section className="card" style={{ padding: "2rem" }}>
            <div style={{ marginBottom: "1.5rem" }}>
              <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 800 }}>
                <i className="fa-solid fa-file-export" style={{ color: "var(--primary)" }}></i> Operations Export & PDF Centre
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginTop: "0.3rem" }}>
                Generate official operation reports as high-fidelity PDF documents or export raw CRM metrics into CSV/Excel files.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", marginTop: "1rem" }}>
              {/* PDF Column */}
              <div style={{ border: "1px solid var(--card-border)", borderRadius: "12px", padding: "1.5rem", background: "rgba(255,255,255,0.01)", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <i className="fa-solid fa-file-pdf" style={{ fontSize: "1.5rem", color: "var(--danger)" }}></i>
                  <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>Print Operations Summary</h3>
                </div>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", minHeight: "40px" }}>
                  Generate a complete operations report including all metrics tables and the activity scatter timeline graph.
                </p>
                <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                  <button className="btn-primary-small" onClick={handlePrint} style={{ padding: "0.6rem 1.25rem" }}>
                    <i className="fa-solid fa-file-pdf"></i> Export as PDF
                  </button>
                  <button className="btn-primary-small" onClick={handleDocx} style={{ padding: "0.6rem 1.25rem", background: "rgba(59, 130, 246, 0.12)", color: "#3b82f6", border: "1px solid rgba(59, 130, 246, 0.25)" }}>
                    <i className="fa-solid fa-file-word"></i> Export as Document
                  </button>
                </div>
              </div>

              {/* Excel Column */}
              <div style={{ border: "1px solid var(--card-border)", borderRadius: "12px", padding: "1.5rem", background: "rgba(255,255,255,0.01)", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <i className="fa-solid fa-file-excel" style={{ fontSize: "1.5rem", color: "var(--success)" }}></i>
                  <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>Export Spreadsheets (Excel / CSV)</h3>
                </div>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", minHeight: "60px" }}>
                  Download complete spreadsheets of each table compiled directly from GHL audit records and standard phone report CSVs.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <button className="btn-primary-small" onClick={handleExportTable1} style={{ textAlign: "left", width: "100%", justifyContent: "flex-start", background: "rgba(113, 167, 88, 0.1)", color: "var(--success)", border: "1px solid rgba(113, 167, 88, 0.2)" }}>
                    <i className="fa-solid fa-download"></i> Download Table 1 (Agent Conversion)
                  </button>
                  <button className="btn-primary-small" onClick={handleExportTable2} style={{ textAlign: "left", width: "100%", justifyContent: "flex-start", background: "rgba(113, 167, 88, 0.1)", color: "var(--success)", border: "1px solid rgba(113, 167, 88, 0.2)" }}>
                    <i className="fa-solid fa-download"></i> Download Table 2 (Lead Sprints)
                  </button>
                  <button className="btn-primary-small" onClick={handleExportTable3} style={{ textAlign: "left", width: "100%", justifyContent: "flex-start", background: "rgba(113, 167, 88, 0.1)", color: "var(--success)", border: "1px solid rgba(113, 167, 88, 0.2)" }}>
                    <i className="fa-solid fa-download"></i> Download Table 3 (Call Analytics)
                  </button>
                </div>
              </div>

              {/* JSON Column */}
              <div style={{ border: "1px solid var(--card-border)", borderRadius: "12px", padding: "1.5rem", background: "rgba(255,255,255,0.01)", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <i className="fa-solid fa-code" style={{ fontSize: "1.5rem", color: "#38bdf8" }}></i>
                  <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>Unified Daily Record (JSON)</h3>
                </div>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", minHeight: "40px" }}>
                  Download a single unified database file compiling all parsed spreadsheets, GHL API calls, and audit timeline records.
                </p>
                <button className="btn-primary-small" onClick={handleJsonExport} style={{ textAlign: "center", width: "100%", background: "rgba(56, 189, 248, 0.12)", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.25)", padding: "0.65rem 1rem" }}>
                  <i className="fa-solid fa-download"></i> Download Unified JSON
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
