"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";

// Fixed canvas width — the horizontal scroll container will handle overflow
const CANVAS_MIN_WIDTH = 1200;

export default function TeamTimeline({
  agents,
  selectedAgent,
  onSelectAgent,
  reportDate = "2026-07-17",
  showGhlMessages = true,
  ghlMessages = [],
  hideNames = false,
  theme = "dark",
  timezone = "PKT",
  filterSmsOutbound,
  filterWhatsApp,
  filterAnsweredCalls,
  filterMissedCalls,
  filterCrmActions,
  filterWaText,
  filterWaVoice,
  filterWaCall,
  filterWaOther,
  filterOutboundAnswered,
  filterInboundAnswered,
  filterCrmNotes,
  filterCrmTasks,
  filterCrmOther
}) {
  const getWhatsAppMessageType = (msg) => {
    if (!msg.body) return "text";
    const body = String(msg.body).trim().toLowerCase();
    if (body.includes("voice message") || body.includes("voice_message") || body.includes("[voice")) {
      return "voice";
    }
    if (body.includes("call message") || body.includes("call_message") || body.includes("[call")) {
      return "call";
    }
    if (/\[.*?\]/.test(body)) {
      return "other";
    }
    return "text";
  };
  const canvasRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const containerRef = useRef(null);

  const [startHour, setStartHour] = useState(13);
  const [endHour, setEndHour] = useState(22);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [canvasWidth, setCanvasWidth] = useState(CANVAS_MIN_WIDTH);
  const [startDropOpen, setStartDropOpen] = useState(false);
  const [endDropOpen, setEndDropOpen] = useState(false);

  // Layout constants
  const timelineLeftMargin = hideNames ? 0 : 160;
  const timelineRightMargin = 40;
  const timelineRowHeight = 40;
  const timelineTopMargin = 30;
  const timelineBottomMargin = 20;

  const colors = {
    active: "#71a758",
    activeHover: "#5a8646",
    primary: "#d15c2e",
    accent: "#a74a25",
  };

  const getMinTime = () => {
    const [yr, mo, dy] = reportDate.split("-").map(Number);
    return new Date(yr, mo - 1, dy, startHour, 0, 0);
  };
  const getMaxTime = () => {
    const [yr, mo, dy] = reportDate.split("-").map(Number);
    return new Date(yr, mo - 1, dy, endHour, 0, 0);
  };

  const getX = (timeStrOrMs, width) => {
    const timeMs = new Date(timeStrOrMs).getTime();
    const startMs = getMinTime().getTime();
    const endMs = getMaxTime().getTime();
    const drawableWidth = width - timelineLeftMargin - timelineRightMargin;
    const fraction = (timeMs - startMs) / (endMs - startMs);
    return timelineLeftMargin + fraction * drawableWidth;
  };

  const formatSecondsToTime = (seconds) => {
    const sec = Math.round(seconds);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h.toString().padStart(2, "0")}h ${m.toString().padStart(2, "0")}m`;
  };

  const formatIsoToTime = (isoStr) => {
    const dateObj = new Date(isoStr);
    return (
      dateObj.getHours().toString().padStart(2, "0") +
      ":" +
      dateObj.getMinutes().toString().padStart(2, "0")
    );
  };

  const parseDurationToSeconds = (durStr) => {
    if (!durStr || durStr === "-") return 0;
    const clean = String(durStr).trim().toLowerCase();
    if (/^\d+$/.test(clean)) {
      return parseInt(clean, 10);
    }
    const parts = clean.split(":");
    if (parts.length === 2) {
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    } else if (parts.length === 3) {
      return parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10);
    }
    let totalSecs = 0;
    const hrsMatch = clean.match(/(\d+)\s*(?:hr|hour|h)/);
    const minsMatch = clean.match(/(\d+)\s*(?:min|m)/);
    const secsMatch = clean.match(/(\d+)\s*(?:sec|s)/);
    if (hrsMatch) totalSecs += parseInt(hrsMatch[1], 10) * 3600;
    if (minsMatch) totalSecs += parseInt(minsMatch[1], 10) * 60;
    if (secsMatch) totalSecs += parseInt(secsMatch[1], 10);
    return totalSecs;
  };

  const getActionSummary = (act) => {
    if (!act.details) return null;
    try {
      const details = typeof act.details === "string" ? JSON.parse(act.details) : act.details;
      
      if (act.module === "NOTE") {
        if (details.body) {
          const cleanText = details.body.replace(/<\/?[^>]+(>|$)/g, "").replace(/&nbsp;/g, " ").trim();
          return cleanText ? `Note: "${cleanText}"` : null;
        }
      }
      
      if (act.module === "OPPORTUNITY") {
        const parts = [];
        if (details.pipelineStageName) {
          parts.push(`Stage: ${details.pipelineStageName}`);
        }
        if (details.status) {
          parts.push(`Status: ${details.status}`);
        }
        if (details.source) {
          parts.push(`Source: ${details.source}`);
        }
        if (details.name) {
          parts.push(`Opp: ${details.name}`);
        }
        return parts.join(" | ") || null;
      }
      
      if (act.module === "CONTACT") {
        const parts = [];
        if (details.firstName || details.lastName) {
          parts.push(`Contact: ${[details.firstName, details.lastName].filter(Boolean).join(" ")}`);
        }
        if (details.phone) {
          parts.push(`Phone: ${details.phone}`);
        }
        if (details.email) {
          parts.push(`Email: ${details.email}`);
        }
        return parts.join(" | ") || null;
      }
      
      if (act.module === "TASK") {
        const parts = [];
        if (details.title) {
          parts.push(`Task: ${details.title}`);
        }
        if (details.description) {
          parts.push(`Desc: ${details.description}`);
        }
        return parts.join(" | ") || null;
      }
    } catch (e) {
      if (typeof act.details === "string") {
        return act.details.substring(0, 50);
      }
    }
    return null;
  };

  // ── Resize Observer: keep canvasWidth ≥ CANVAS_MIN_WIDTH ──────────────────
  useEffect(() => {
    const updateWidth = () => {
      if (!scrollContainerRef.current) return;
      const containerW = scrollContainerRef.current ? scrollContainerRef.current.clientWidth : CANVAS_MIN_WIDTH;
      setCanvasWidth(Math.max(CANVAS_MIN_WIDTH, containerW));
    };
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    if (scrollContainerRef.current) ro.observe(scrollContainerRef.current);
    return () => ro.disconnect();
  }, [hideNames]);

  // ── Draw the main timeline canvas ─────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvasWidth;
    const displayHeight =
      timelineTopMargin +
      timelineBottomMargin +
      Math.max(1, agents.length) * timelineRowHeight;

    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
    ctx.scale(dpr, dpr);

    const isDark =
      document.body.classList.contains("dark-mode") ||
      !document.body.classList.contains("light-mode");

    ctx.clearRect(0, 0, displayWidth, displayHeight);

    if (agents.length === 0) {
      ctx.fillStyle = isDark ? "#ffffff" : "#0f172a";
      ctx.font = "600 13px Outfit";
      ctx.textAlign = "center";
      ctx.fillText(
        "No agents match the search criteria",
        displayWidth / 2,
        displayHeight / 2
      );
      return;
    }

    // Background
    ctx.fillStyle = isDark ? "#0a0a0a" : "#ffffff";
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    // ── 1. Hour grid lines & labels ──────────────────────────────────────
    ctx.strokeStyle = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
    ctx.lineWidth = 1;
    ctx.font = "500 11px Outfit";
    ctx.fillStyle = "#64748b";
    ctx.textAlign = "center";

    const startMs = getMinTime().getTime();
    const endMs = getMaxTime().getTime();
    const totalHours = (endMs - startMs) / (1000 * 60 * 60);
    const intervalHours = totalHours > 12 ? 2 : totalHours > 6 ? 1 : 0.5;

    const drawDate = new Date(startMs);
    if (intervalHours === 0.5) {
      drawDate.setMinutes(drawDate.getMinutes() < 30 ? 0 : 30);
    } else {
      drawDate.setMinutes(0);
    }
    drawDate.setSeconds(0);
    drawDate.setMilliseconds(0);

    while (drawDate.getTime() <= endMs) {
      if (drawDate.getTime() >= startMs) {
        const xVal = getX(drawDate.getTime(), displayWidth);
        ctx.beginPath();
        ctx.moveTo(xVal, timelineTopMargin - 10);
        ctx.lineTo(xVal, displayHeight - timelineBottomMargin);
        ctx.stroke();

        let label =
          drawDate.getHours().toString().padStart(2, "0") +
          ":" +
          drawDate.getMinutes().toString().padStart(2, "0");
        
        // Render midnight boundary as 24:00 instead of 00:00
        if (drawDate.getDate() === 18 && drawDate.getHours() === 0) {
          label = "24:00";
        }
        
        // Prevent label clipping at canvas boundaries by shifting text alignment
        if (xVal < timelineLeftMargin + 25) {
          ctx.textAlign = "left";
          ctx.fillText(label, xVal + 4, timelineTopMargin - 15);
        } else if (xVal > displayWidth - 25) {
          ctx.textAlign = "right";
          ctx.fillText(label, xVal - 4, timelineTopMargin - 15);
        } else {
          ctx.textAlign = "center";
          ctx.fillText(label, xVal, timelineTopMargin - 15);
        }
      }
      if (intervalHours === 0.5) {
        drawDate.setMinutes(drawDate.getMinutes() + 30);
      } else {
        drawDate.setHours(drawDate.getHours() + intervalHours);
      }
    }

    // ── 2. Agent rows ────────────────────────────────────────────────────
    agents.forEach((agent, idx) => {
      const yCenter =
        timelineTopMargin + idx * timelineRowHeight + timelineRowHeight / 2;
      const rowTop = timelineTopMargin + idx * timelineRowHeight;

      const isHoveredRow =
        hoveredItem && hoveredItem.agent && hoveredItem.agent.name === agent.name;
      const isSelectedRow = selectedAgent && selectedAgent.name === agent.name;

      // Row highlight
      if (isSelectedRow) {
        ctx.fillStyle = isDark
          ? "rgba(79, 70, 229, 0.15)"
          : "rgba(67, 56, 202, 0.08)";
        ctx.fillRect(0, rowTop, displayWidth, timelineRowHeight);
      } else if (isHoveredRow) {
        ctx.fillStyle = isDark
          ? "rgba(255,255,255,0.02)"
          : "rgba(0,0,0,0.01)";
        ctx.fillRect(0, rowTop, displayWidth, timelineRowHeight);
      }

      // Row divider
      ctx.strokeStyle = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, rowTop + timelineRowHeight);
      ctx.lineTo(displayWidth, rowTop + timelineRowHeight);
      ctx.stroke();

      // Agent Name (drawn on the left side of the canvas)
      if (!hideNames) {
        ctx.fillStyle = isSelectedRow
          ? isDark ? "#fb923c" : "#d15c2e"
          : isDark ? "#faefea" : "#2a1209";
        ctx.font = isSelectedRow ? "700 12px Outfit" : "600 12px Outfit";
        ctx.textAlign = "left";
        ctx.fillText(agent.name, 15, yCenter + 4);
      }

      const details = agent.details || agent;

      // ── GHL Action / Operation markers ──────────────────────────────────────────
      let agentActions = details.actions_list || [];
      if (filterCrmActions) {
        agentActions = agentActions.filter(act => {
          if (act.module === "NOTE") return filterCrmNotes;
          if (act.module === "TASK" || act.module === "TASK_ADD" || act.action?.toLowerCase().includes("task")) return filterCrmTasks;
          return filterCrmOther;
        });
      } else {
        agentActions = [];
      }
      agentActions.forEach((act) => {
        const actTime = new Date(act.timestamp);
        if (actTime >= getMinTime() && actTime <= getMaxTime()) {
          const xVal = getX(actTime, displayWidth);
          const isHoveredAction =
            hoveredItem &&
            hoveredItem.type === "action" &&
            hoveredItem.data === act &&
            hoveredItem.agent.name === agent.name;

          let actColor = "#eab308"; // default Yellow
          if (act.module === "NOTE") {
            actColor = "#f97316"; // Orange
          } else if (act.module === "TASK" || act.module === "TASK_ADD" || act.action?.toLowerCase().includes("task")) {
            actColor = "#ec4899"; // Fuchsia
          }

          ctx.fillStyle = actColor;
          ctx.beginPath();
          ctx.arc(xVal, yCenter, isHoveredAction ? 6.5 : 4.5, 0, 2 * Math.PI);
          ctx.fill();

          if (isHoveredAction) {
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }
      });

      // ── Phone Call markers ──────────────────────────────────────────────────────
      const agentCalls = (details.calls || []).filter(call => {
        const isAnswered = call.status && (call.status.toLowerCase() === "answered" || call.status.toLowerCase() === "completed");
        const isOutbound = call.direction?.toLowerCase() === "outbound";
        if (isAnswered) {
          if (!filterAnsweredCalls) return false;
          return isOutbound ? filterOutboundAnswered : filterInboundAnswered;
        } else {
          return !isOutbound && filterMissedCalls;
        }
      });

      agentCalls.forEach((call) => {
        const callTime = new Date(call.timestamp);
        if (callTime >= getMinTime() && callTime <= getMaxTime()) {
          const isHoveredCall =
            hoveredItem &&
            hoveredItem.type === "call" &&
            hoveredItem.data === call &&
            hoveredItem.agent.name === agent.name;

          const durationSec = parseDurationToSeconds(call.duration);
          const isAnswered = call.status && (call.status.toLowerCase() === "answered" || call.status.toLowerCase() === "completed");
          const isOutbound = call.direction?.toLowerCase() === "outbound";

          let callColor = "#f43f5e"; // Missed Call (Red)
          if (isAnswered) {
            callColor = isOutbound ? "#3b82f6" : "#8b5cf6"; // Outbound Answered (Blue) vs Inbound Answered (Purple)
          }

          ctx.fillStyle = callColor;
          const startMs = callTime.getTime();
          const endMs = startMs + durationSec * 1000;
          const xStart = getX(startMs, displayWidth);
          const xEnd = getX(endMs, displayWidth);
          const callWidth = Math.max(8, xEnd - xStart);
          const pillHeight = 8;

          ctx.beginPath();
          ctx.roundRect(xStart - pillHeight / 2, yCenter - pillHeight / 2, callWidth, pillHeight, pillHeight / 2);
          ctx.fill();

          if (isHoveredCall) {
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }
      });

      // ── GHL Message markers (if enabled) ────────────────────────────────────────
      if (showGhlMessages) {
        const agentMessages = ghlMessages.filter((msg) => {
          if ((msg.agent_name || msg.agent || "").toLowerCase() !== agent.name.toLowerCase()) return false;
          
          if (msg.type === "whatsapp") {
            if (!filterWhatsApp) return false;
            const waType = getWhatsAppMessageType(msg);
            if (waType === "text") return filterWaText;
            if (waType === "voice") return filterWaVoice;
            if (waType === "call") return filterWaCall;
            if (waType === "other") return filterWaOther;
            return false;
          }
          
          return filterSmsOutbound;
        });

        agentMessages.forEach((msg) => {
          const msgTime = new Date(msg.timestamp || msg.time);
          if (msgTime >= getMinTime() && msgTime <= getMaxTime()) {
            const xVal = getX(msgTime, displayWidth);
            const isHoveredMsg =
              hoveredItem &&
              hoveredItem.type === "message" &&
              hoveredItem.data === msg &&
              hoveredItem.agent.name === agent.name;

            let msgColor = msg.type === "whatsapp" ? "#22c55e" : "#06b6d4";
            ctx.fillStyle = msgColor;
            ctx.beginPath();
            ctx.arc(xVal, yCenter, isHoveredMsg ? 6.5 : 4.5, 0, 2 * Math.PI);
            ctx.fill();

            if (isHoveredMsg) {
              ctx.strokeStyle = "#ffffff";
              ctx.lineWidth = 1.5;
              ctx.stroke();
            }
          }
        });
      }
    });
  }, [
    agents,
    selectedAgent,
    hoveredItem,
    canvasWidth,
    startHour,
    endHour,
    reportDate,
    showGhlMessages,
    ghlMessages,
    hideNames,
    theme,
    filterSmsOutbound,
    filterWhatsApp,
    filterAnsweredCalls,
    filterMissedCalls,
    filterCrmActions,
    filterWaText,
    filterWaVoice,
    filterWaCall,
    filterWaOther,
    filterOutboundAnswered,
    filterInboundAnswered,
    filterCrmNotes,
    filterCrmTasks,
    filterCrmOther
  ]);

  // ── Hover/Mouse tracking ──────────────────────────────────────────────────
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const minTime = getMinTime().getTime();
    const maxTime = getMaxTime().getTime();

    let found = null;

    agents.forEach((agent, idx) => {
      const yCenter =
        timelineTopMargin + idx * timelineRowHeight + timelineRowHeight / 2;
      const details = agent.details || agent;

      // 1. Check GHL Actions
      let agentActions = details.actions_list || [];
      if (filterCrmActions) {
        agentActions = agentActions.filter(act => {
          if (act.module === "NOTE") return filterCrmNotes;
          if (act.module === "TASK" || act.module === "TASK_ADD" || act.action?.toLowerCase().includes("task")) return filterCrmTasks;
          return filterCrmOther;
        });
        agentActions.forEach((act) => {
          const actTime = new Date(act.timestamp);
          if (actTime >= getMinTime() && actTime <= getMaxTime()) {
            const xVal = getX(actTime, canvasWidth);
            const dist = Math.hypot(x - xVal, y - yCenter);
            if (dist < 8) {
              found = {
                type: "action",
                agent,
                data: act,
                x: e.clientX,
                y: e.clientY,
              };
            }
          }
        });
      }

      // 2. Check Calls
      const agentCalls = (details.calls || []).filter(call => {
        const isAnswered = call.status && (call.status.toLowerCase() === "answered" || call.status.toLowerCase() === "completed");
        const isOutbound = call.direction?.toLowerCase() === "outbound";
        if (isAnswered) {
          if (!filterAnsweredCalls) return false;
          return isOutbound ? filterOutboundAnswered : filterInboundAnswered;
        } else {
          return !isOutbound && filterMissedCalls;
        }
      });

      agentCalls.forEach((call) => {
        const callTime = new Date(call.timestamp);
        if (callTime >= getMinTime() && callTime <= getMaxTime()) {
          const durationSec = parseDurationToSeconds(call.duration);
          const startMs = callTime.getTime();
          const endMs = startMs + durationSec * 1000;
          const xStart = getX(startMs, canvasWidth);
          const xEnd = getX(endMs, canvasWidth);
          const callWidth = Math.max(8, xEnd - xStart);
          const pillHeight = 8;

          const isInside = x >= (xStart - pillHeight / 2) && x <= (xStart - pillHeight / 2 + callWidth) &&
                           y >= (yCenter - pillHeight / 2) && y <= (yCenter + pillHeight / 2);

          if (isInside) {
            found = {
              type: "call",
              agent,
              data: call,
              x: e.clientX,
              y: e.clientY,
            };
          }
        }
      });

      // 3. Check GHL Messages
      if (showGhlMessages) {
        const agentMessages = ghlMessages.filter((msg) => {
          if ((msg.agent_name || msg.agent || "").toLowerCase() !== agent.name.toLowerCase()) return false;
          
          if (msg.type === "whatsapp") {
            if (!filterWhatsApp) return false;
            const waType = getWhatsAppMessageType(msg);
            if (waType === "text") return filterWaText;
            if (waType === "voice") return filterWaVoice;
            if (waType === "call") return filterWaCall;
            if (waType === "other") return filterWaOther;
            return false;
          }
          
          return filterSmsOutbound;
        });

        agentMessages.forEach((msg) => {
          const msgTime = new Date(msg.timestamp || msg.time);
          if (msgTime >= getMinTime() && msgTime <= getMaxTime()) {
            const xVal = getX(msgTime, canvasWidth);
            const dist = Math.hypot(x - xVal, y - yCenter);
            if (dist < 8) {
              found = {
                type: "message",
                agent,
                data: msg,
                x: e.clientX,
                y: e.clientY,
              };
            }
          }
        });
      }

      // 4. Check row hover fallback if no marker
      if (!found) {
        const rowTop = timelineTopMargin + idx * timelineRowHeight;
        if (y >= rowTop && y < rowTop + timelineRowHeight && x >= 0 && x < canvasWidth) {
          found = {
            type: "row",
            agent,
            x: e.clientX,
            y: e.clientY,
          };
        }
      }
    });

    setHoveredItem(found);
  };

  const handleMouseLeave = () => {
    setHoveredItem(null);
  };

  const handleClick = () => {
    if (hoveredItem && hoveredItem.agent && onSelectAgent) {
      onSelectAgent(hoveredItem.agent);
    }
  };

  const renderTooltip = () => {
    if (!hoveredItem || hoveredItem.type === "row") return null;

    const { type, data } = hoveredItem;
    const isDark =
      document.body.classList.contains("dark-mode") ||
      !document.body.classList.contains("light-mode");

    const tooltipStyle = {
      position: "fixed",
      left: `${hoveredItem.x + 15}px`,
      top: `${hoveredItem.y + 10}px`,
      background: isDark ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.95)",
      border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
      color: isDark ? "#f1f5f9" : "#0f172a",
      padding: "0.6rem 0.8rem",
      borderRadius: "8px",
      fontSize: "0.78rem",
      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
      zIndex: 99999,
      pointerEvents: "none",
      minWidth: "160px",
      backdropFilter: "blur(4px)",
    };

    if (type === "action") {
      const actTimeStr = formatIsoToTime(data.timestamp);
      return (
        <div className="timeline-canvas-tooltip" style={tooltipStyle}>
          <div style={{ fontWeight: 800, color: "var(--primary)", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "0.25rem", marginBottom: "0.4rem" }}>
            GHL Update ({data.module})
          </div>
          <div>{getActionSummary(data) || `Updated GHL records`}</div>
          <div style={{ marginTop: "0.3rem", fontSize: "0.72rem", opacity: 0.8 }}>
            Time: {actTimeStr} {timezone}
          </div>
        </div>
      );
    }

    if (type === "call") {
      const callTimeStr = formatIsoToTime(data.timestamp);
      const isAnswered =
        parseDurationToSeconds(data.duration) > 0 &&
        data.status?.toLowerCase() !== "no-answer";

      return (
        <div className="timeline-canvas-tooltip" style={tooltipStyle}>
          <div style={{ fontWeight: 800, color: isAnswered ? "#71a758" : "#ef4444", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "0.25rem", marginBottom: "0.4rem" }}>
            Phone Call ({data.direction})
          </div>
          <div>Contact: {data.contact_name || "Unknown"}</div>
          <div>Status: {data.status || "Completed"}</div>
          <div>Duration: {data.duration}</div>
          <div style={{ marginTop: "0.3rem", fontSize: "0.72rem", opacity: 0.8 }}>
            Time: {callTimeStr} {timezone}
          </div>
        </div>
      );
    }

    if (type === "message") {
      const msgTimeStr = formatIsoToTime(data.timestamp || data.time);
      return (
        <div className="timeline-canvas-tooltip" style={tooltipStyle}>
          <div style={{ fontWeight: 800, color: "#38bdf8", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "0.25rem", marginBottom: "0.4rem" }}>
            GHL Message ({data.direction || "outbound"})
          </div>
          <div>Contact: {data.contact_name || data.contactName || "Unknown"}</div>
          <div style={{ fontStyle: "italic", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "200px" }}>
            "{data.body || "No message body"}"
          </div>
          <div style={{ marginTop: "0.3rem", fontSize: "0.72rem", opacity: 0.8 }}>
            Time: {msgTimeStr} {timezone}
          </div>
        </div>
      );
    }

    return null;
  };

  const hoveredAgentName = hoveredItem && hoveredItem.agent
    ? hoveredItem.agent.name
    : null;

  return (
    <section className="card timeline-section mt-1">
      {/* ── Card header ─────────────────────────────────────────────────── */}
      <div className="card-header timeline-card-header">
        <div className="timeline-title-row">
          <h2>
            <i className="fa-solid fa-timeline"></i> Interactive Activity Timeline
          </h2>
          {/* Hovered agent name chip */}
          <div className={`timeline-hovered-chip ${hoveredAgentName ? "visible" : ""}`}>
            <i className="fa-solid fa-user"></i>
            <span>{hoveredAgentName || ""}</span>
          </div>
        </div>

        <div className="timeline-controls-row">
          {/* Time range controls */}
          <div className="timeline-controls" style={{ display: "flex", gap: "1.25rem", alignItems: "center" }}>
            {/* Start Hour Custom Dropdown */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <i className="fa-solid fa-hourglass-start" style={{ color: "var(--primary)" }}></i> Start:
              </span>
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setStartDropOpen(!startDropOpen)}
                  style={{
                    padding: "0.4rem 0.9rem",
                    borderRadius: "8px",
                    background: "var(--card-bg)",
                    border: "1px solid var(--card-border)",
                    color: "var(--text-primary)",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  {startHour.toString().padStart(2, "0")}:00
                  <i className={`fa-solid fa-chevron-${startDropOpen ? "up" : "down"}`} style={{ fontSize: "0.65rem", color: "var(--primary)" }}></i>
                </button>
                {startDropOpen && (
                  <>
                    <div onClick={() => setStartDropOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 9999 }} />
                    <div
                      style={{
                        position: "absolute",
                        top: "105%",
                        left: 0,
                        minWidth: "110px",
                        maxHeight: "200px",
                        overflowY: "auto",
                        zIndex: 10000,
                        borderRadius: "8px",
                        border: "1px solid var(--card-border)",
                        background: "var(--card-bg)",
                        boxShadow: "0 10px 15px -3px rgba(0,0,0,0.3)",
                        padding: "0.3rem 0",
                      }}
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <div
                          key={i}
                          onClick={() => {
                            setStartHour(i);
                            if (i >= endHour) setEndHour(Math.min(24, i + 1));
                            setStartDropOpen(false);
                          }}
                          style={{
                            padding: "0.5rem 0.9rem",
                            fontSize: "0.8rem",
                            cursor: "pointer",
                            background: startHour === i ? "rgba(209,92,46,0.08)" : "transparent",
                            color: startHour === i ? "var(--primary)" : "var(--text-primary)",
                            fontWeight: 600,
                          }}
                          onMouseEnter={(e) => { if (startHour !== i) e.currentTarget.style.background = "var(--border-light)"; }}
                          onMouseLeave={(e) => { if (startHour !== i) e.currentTarget.style.background = "transparent"; }}
                        >
                          {i.toString().padStart(2, "0")}:00
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* End Hour Custom Dropdown */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <i className="fa-solid fa-hourglass-end" style={{ color: "var(--primary)" }}></i> End:
              </span>
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setEndDropOpen(!endDropOpen)}
                  style={{
                    padding: "0.4rem 0.9rem",
                    borderRadius: "8px",
                    background: "var(--card-bg)",
                    border: "1px solid var(--card-border)",
                    color: "var(--text-primary)",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  {endHour.toString().padStart(2, "0")}:00
                  <i className={`fa-solid fa-chevron-${endDropOpen ? "up" : "down"}`} style={{ fontSize: "0.65rem", color: "var(--primary)" }}></i>
                </button>
                {endDropOpen && (
                  <>
                    <div onClick={() => setEndDropOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 9999 }} />
                    <div
                      style={{
                        position: "absolute",
                        top: "105%",
                        left: 0,
                        minWidth: "110px",
                        maxHeight: "200px",
                        overflowY: "auto",
                        zIndex: 10000,
                        borderRadius: "8px",
                        border: "1px solid var(--card-border)",
                        background: "var(--card-bg)",
                        boxShadow: "0 10px 15px -3px rgba(0,0,0,0.3)",
                        padding: "0.3rem 0",
                      }}
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <div
                          key={i}
                          onClick={() => {
                            const val = i + 1;
                            setEndHour(val);
                            if (val <= startHour) setStartHour(Math.max(0, val - 1));
                            setEndDropOpen(false);
                          }}
                          style={{
                            padding: "0.5rem 0.9rem",
                            fontSize: "0.8rem",
                            cursor: "pointer",
                            background: endHour === (i + 1) ? "rgba(209,92,46,0.08)" : "transparent",
                            color: endHour === (i + 1) ? "var(--primary)" : "var(--text-primary)",
                            fontWeight: 600,
                          }}
                          onMouseEnter={(e) => { if (endHour !== (i + 1)) e.currentTarget.style.background = "var(--border-light)"; }}
                          onMouseLeave={(e) => { if (endHour !== (i + 1)) e.currentTarget.style.background = "transparent"; }}
                        >
                          {(i + 1).toString().padStart(2, "0")}:00
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Legend Row */}
          <div className="timeline-legend" style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap", fontSize: "0.74rem" }}>
            <span className="legend-item" style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "var(--text-secondary)" }}>
              <span className="legend-color" style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#3b82f6" }}></span>Outbound Call
            </span>
            <span className="legend-item" style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "var(--text-secondary)" }}>
              <span className="legend-color" style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#10b981" }}></span>Inbound Call
            </span>
            <span className="legend-item" style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "var(--text-secondary)" }}>
              <span className="legend-color" style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#ef4444" }}></span>Missed Call
            </span>
            <span className="legend-item" style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "var(--text-secondary)" }}>
              <span className="legend-color" style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#f43f5e" }}></span>CRM Note
            </span>
            <span className="legend-item" style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "var(--text-secondary)" }}>
              <span className="legend-color" style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#10b981" }}></span>CRM Contact
            </span>
            <span className="legend-item" style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "var(--text-secondary)" }}>
              <span className="legend-color" style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#a855f7" }}></span>Interested
            </span>
            <span className="legend-item" style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "var(--text-secondary)" }}>
              <span className="legend-color" style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#06b6d4" }}></span>Contacted
            </span>
            <span className="legend-item" style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "var(--text-secondary)" }}>
              <span className="legend-color" style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#eab308" }}></span>Other Opp
            </span>
          </div>
        </div>
      </div>

      {/* ── Canvas area: sticky names + scrollable chart (No vertical scroll maxHeight) ─────────────────── */}
      <div ref={containerRef} className="timeline-canvas-wrapper">
        {/* Chart area (horizontal scroll only) */}
        <div
          ref={scrollContainerRef}
          id="timeline-canvas-container"
          className="timeline-chart-panel"
          style={{ flex: 1, overflowX: "auto" }}
        >
          <canvas
            ref={canvasRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
            style={{ cursor: hoveredItem ? "pointer" : "default", display: "block" }}
          />
        </div>
      </div>

      <div className="timeline-tip">
        <i className="fa-solid fa-info-circle"></i> Hover over work blocks to view details. Click on a row to inspect the agent.
      </div>

      {renderTooltip()}
    </section>
  );
}
