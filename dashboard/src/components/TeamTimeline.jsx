"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";

// Fixed canvas width — the horizontal scroll container will handle overflow
const CANVAS_MIN_WIDTH = 1200;
// Max visible height before vertical scroll kicks in
const MAX_VISIBLE_HEIGHT = 520;

export default function TeamTimeline({ agents, selectedAgent, onSelectAgent }) {
  const canvasRef = useRef(null);
  const namesCanvasRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const namesScrollRef = useRef(null);
  const containerRef = useRef(null);
  const isSyncingScroll = useRef(false);

  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(20);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [canvasWidth, setCanvasWidth] = useState(CANVAS_MIN_WIDTH);

  // Layout constants
  const timelineLeftMargin = 0;   // Names are on separate canvas now
  const timelineRightMargin = 40;
  const timelineRowHeight = 40;
  const timelineTopMargin = 30;
  const timelineBottomMargin = 20;

  const namesColumnWidth = 160;

  const colors = {
    active: "#71a758",
    activeHover: "#5a8646",
    primary: "#d15c2e",
    accent: "#a74a25",
  };

  const getMinTime = () => new Date(Date.UTC(2026, 6, 17, startHour, 0, 0));
  const getMaxTime = () => new Date(Date.UTC(2026, 6, 17, endHour, 0, 0));

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
      dateObj.getUTCHours().toString().padStart(2, "0") +
      ":" +
      dateObj.getUTCMinutes().toString().padStart(2, "0")
    );
  };

  const parseDurationToSeconds = (durStr) => {
    if (!durStr || durStr === "-") return 0;
    const parts = durStr.split(":");
    if (parts.length === 2) {
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    } else if (parts.length === 3) {
      return parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10);
    }
    return 0;
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
      const containerW = scrollContainerRef.current.clientWidth;
      setCanvasWidth(Math.max(CANVAS_MIN_WIDTH, containerW));
    };
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    if (scrollContainerRef.current) ro.observe(scrollContainerRef.current);
    return () => ro.disconnect();
  }, []);

  // ── Sync vertical scroll between names panel and chart ────────────────────
  const handleChartScroll = useCallback(() => {
    if (isSyncingScroll.current) return;
    if (!scrollContainerRef.current || !namesScrollRef.current) return;
    isSyncingScroll.current = true;
    namesScrollRef.current.scrollTop = scrollContainerRef.current.scrollTop;
    isSyncingScroll.current = false;
  }, []);

  const handleNamesScroll = useCallback(() => {
    if (isSyncingScroll.current) return;
    if (!scrollContainerRef.current || !namesScrollRef.current) return;
    isSyncingScroll.current = true;
    scrollContainerRef.current.scrollTop = namesScrollRef.current.scrollTop;
    isSyncingScroll.current = false;
  }, []);

  // ── Draw the sticky names column ──────────────────────────────────────────
  useEffect(() => {
    const namesCanvas = namesCanvasRef.current;
    if (!namesCanvas) return;

    const dpr = window.devicePixelRatio || 1;
    const displayHeight =
      timelineTopMargin +
      timelineBottomMargin +
      Math.max(1, agents.length) * timelineRowHeight;

    namesCanvas.width = namesColumnWidth * dpr;
    namesCanvas.height = displayHeight * dpr;
    namesCanvas.style.width = `${namesColumnWidth}px`;
    namesCanvas.style.height = `${displayHeight}px`;

    const ctx = namesCanvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, namesColumnWidth, displayHeight);

    const isDark =
      document.body.classList.contains("dark-mode") ||
      !document.body.classList.contains("light-mode");

    // Background matching card bg
    ctx.fillStyle = isDark ? "#0a0a0a" : "#ffffff";
    ctx.fillRect(0, 0, namesColumnWidth, displayHeight);

    // Separator line on the right edge
    ctx.strokeStyle = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(namesColumnWidth - 0.5, 0);
    ctx.lineTo(namesColumnWidth - 0.5, displayHeight);
    ctx.stroke();

    // Row dividers + agent names
    agents.forEach((agent, idx) => {
      const yCenter =
        timelineTopMargin + idx * timelineRowHeight + timelineRowHeight / 2;
      const rowTop = timelineTopMargin + idx * timelineRowHeight;
      const isSelectedRow = selectedAgent && selectedAgent.name === agent.name;
      const isHoveredRow =
        hoveredItem && hoveredItem.agent && hoveredItem.agent.name === agent.name;

      // Row highlight
      if (isSelectedRow) {
        ctx.fillStyle = isDark
          ? "rgba(79, 70, 229, 0.15)"
          : "rgba(67, 56, 202, 0.08)";
        ctx.fillRect(0, rowTop, namesColumnWidth, timelineRowHeight);
      } else if (isHoveredRow) {
        ctx.fillStyle = isDark
          ? "rgba(255, 255, 255, 0.03)"
          : "rgba(0, 0, 0, 0.02)";
        ctx.fillRect(0, rowTop, namesColumnWidth, timelineRowHeight);
      }

      // Row divider
      ctx.strokeStyle = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, rowTop + timelineRowHeight);
      ctx.lineTo(namesColumnWidth, rowTop + timelineRowHeight);
      ctx.stroke();

      // Name text
      ctx.fillStyle = isSelectedRow
        ? isDark ? "#8b5cf6" : "#4338ca"
        : isDark ? "#f8fafc" : "#0f172a";
      ctx.font = isSelectedRow ? "700 12px Outfit" : "600 12px Outfit";
      ctx.textAlign = "left";
      ctx.fillText(agent.name, 15, yCenter + 4);
    });
  }, [agents, selectedAgent, hoveredItem]);

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
      ctx.fillStyle = isDark ? "#94a3b8" : "#475569";
      ctx.font = "14px Outfit";
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
          drawDate.getUTCHours().toString().padStart(2, "0") +
          ":" +
          drawDate.getUTCMinutes().toString().padStart(2, "0");
        
        // Render midnight boundary as 24:00 instead of 00:00
        if (drawDate.getUTCDate() === 18 && drawDate.getUTCHours() === 0) {
          label = "24:00";
        }
        
        // Prevent label clipping at canvas boundaries by shifting text alignment
        if (xVal < 25) {
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
        drawDate.setUTCHours(drawDate.getUTCHours() + intervalHours);
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

      const details = agent.details;



      // ── GHL Action / Operation markers ──────────────────────────────────────────
      const agentActions = details.actions_list || [];
      agentActions.forEach((act) => {
        const actTime = new Date(act.timestamp);
        if (actTime >= getMinTime() && actTime <= getMaxTime()) {
          const xVal = getX(actTime, displayWidth);
          const isHoveredAction =
            hoveredItem &&
            hoveredItem.type === "action" &&
            hoveredItem.data === act &&
            hoveredItem.agent.name === agent.name;

          let actColor = "#db8324";
          if (act.module === "NOTE") actColor = "#db8324";
          else if (act.module === "OPPORTUNITY") actColor = "#a74a25";
          else if (act.module === "CONTACT") actColor = "#71a758";

          ctx.fillStyle = actColor;
          ctx.fillRect(xVal - 1.5, yCenter - 10, 3, 20); // Each bar is one operation (width 3px, height 20px)

          if (isHoveredAction) {
            ctx.strokeStyle = "white";
            ctx.lineWidth = 1;
            ctx.strokeRect(xVal - 1.5, yCenter - 10, 3, 20);
          }
        }
      });

      // ── Call markers (Outbound Calls Only) ──────────────────────────────────────────
      const agentCalls = agent.calls || [];
      agentCalls.forEach((c) => {
        if (c.direction !== "outbound") return; // Show only outbound calls
        const callTime = new Date(c.timestamp);
        if (callTime >= getMinTime() && callTime <= getMaxTime()) {
          const durationSecs = parseDurationToSeconds(c.duration);
          const callStartX = getX(callTime, displayWidth);
          const callEndX = getX(callTime.getTime() + durationSecs * 1000, displayWidth);
          const barWidth = Math.max(6, callEndX - callStartX);
          
          const isHoveredCall =
            hoveredItem &&
            hoveredItem.type === "call" &&
            hoveredItem.data === c &&
            hoveredItem.agent.name === agent.name;

          let callColor = "#db8324";
          if (c.status !== "Answered") {
            callColor = "#ef4444";
          }

          ctx.fillStyle = callColor;
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(callStartX, yCenter - 7, barWidth, 14, 3);
          } else {
            ctx.rect(callStartX, yCenter - 7, barWidth, 14);
          }
          ctx.fill();

          ctx.strokeStyle = isHoveredCall ? "white" : "rgba(255,255,255,0.6)";
          ctx.lineWidth = isHoveredCall ? 1 : 0.5;
          ctx.stroke();
        }
      });
    });
  }, [agents, startHour, endHour, hoveredItem, selectedAgent, canvasWidth]);

  // ── Mouse interaction ─────────────────────────────────────────────────────
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    // Account for vertical scroll inside the chart pane (if any)
    const scrollTop = scrollContainerRef.current
      ? scrollContainerRef.current.scrollTop
      : 0;
    const y = e.clientY - rect.top + scrollTop;

    if (
      y < timelineTopMargin ||
      y > timelineTopMargin + agents.length * timelineRowHeight
    ) {
      handleMouseLeave();
      return;
    }

    const idx = Math.floor((y - timelineTopMargin) / timelineRowHeight);
    const agent = agents[idx];
    if (!agent) {
      handleMouseLeave();
      return;
    }

    const displayWidth = canvasWidth;
    const yCenter =
      timelineTopMargin + idx * timelineRowHeight + timelineRowHeight / 2;
    const details = agent.details;
    let hovered = null;

    // 1. Calls (Outbound Only) - Check call blocks first to prioritize hover over sessions
    const calls = agent.calls || [];
    for (const c of calls) {
      if (c.direction !== "outbound") continue; // Check only outbound calls
      const callTime = new Date(c.timestamp);
      if (callTime >= getMinTime() && callTime <= getMaxTime()) {
        const durationSecs = parseDurationToSeconds(c.duration);
        const callStartX = getX(callTime, canvasWidth);
        const callEndX = getX(callTime.getTime() + durationSecs * 1000, canvasWidth);
        const barWidth = Math.max(6, callEndX - callStartX);

        if (x >= callStartX && x <= callStartX + barWidth && Math.abs(y - yCenter) <= 7) {
          hovered = { agent, type: "call", data: c, x: e.clientX, y: e.clientY };
          break;
        }
      }
    }

    // 2. GHL Actions (Operations) - Check operation markers first to prioritize hover
    if (!hovered) {
      const actions = details.actions_list || [];
      for (const act of actions) {
        const actTime = new Date(act.timestamp);
        if (actTime >= getMinTime() && actTime <= getMaxTime()) {
          const xVal = getX(actTime, canvasWidth);
          if (Math.abs(x - xVal) <= 5 && Math.abs(y - yCenter) <= 10) {
            hovered = { agent, type: "action", data: act, x: e.clientX, y: e.clientY };
            break;
          }
        }
      }
    }



    if (!hovered) {
      hovered = { agent, type: "row", data: null, x: e.clientX, y: e.clientY };
    }

    setHoveredItem(hovered);
  };

  const handleMouseLeave = () => setHoveredItem(null);

  const handleClick = () => {
    if (hoveredItem && hoveredItem.agent) {
      onSelectAgent(hoveredItem.agent);
    }
  };

  // ── Tooltip ───────────────────────────────────────────────────────────────
  const renderTooltip = () => {
    if (!hoveredItem || hoveredItem.type === "row") return null;

    const { agent, type, data, x, y } = hoveredItem;

    let left = x + 15;
    let top = y + 15;
    if (typeof window !== "undefined") {
      if (left + 260 > window.innerWidth) {
        left = x - 275;
      }
      if (top + 200 > window.innerHeight) {
        top = y - 215;
      }
      left = Math.max(10, left);
      top = Math.max(10, top);
    }

    if (type === "call") {
      const callTime = new Date(data.timestamp);
      const callTimeStr =
        callTime.getUTCHours().toString().padStart(2, "00") +
        ":" +
        callTime.getUTCMinutes().toString().padStart(2, "00");
      return (
        <div
          className="tooltip"
          style={{ left: `${left}px`, top: `${top}px`, display: "flex", opacity: 1 }}
        >
          <div className="tooltip-title">{agent.name}</div>
          <div className="tooltip-row">
            <span className="tooltip-label">State:</span>
            <span className="tooltip-value" style={{ color: "#fb923c" }}>Phone Call Event</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Direction:</span>
            <span className="tooltip-value" style={{ textTransform: "capitalize" }}>{data.direction}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Status:</span>
            <span className="tooltip-value">{data.status}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Time:</span>
            <span className="tooltip-value">{callTimeStr} BST</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Duration:</span>
            <span className="tooltip-value">{data.duration}</span>
          </div>
          {data.contact_name && (
            <div className="tooltip-row">
              <span className="tooltip-label">Contact:</span>
              <span className="tooltip-value">{data.contact_name}</span>
            </div>
          )}
        </div>
      );
    }

    if (type === "action") {
      const actTime = new Date(data.timestamp);
      const actTimeStr =
        actTime.getUTCHours().toString().padStart(2, "00") +
        ":" +
        actTime.getUTCMinutes().toString().padStart(2, "00");
      
      let moduleColor = "#db8324";
      if (data.module === "NOTE") moduleColor = "#db8324";
      else if (data.module === "OPPORTUNITY") moduleColor = "#a74a25";
      else if (data.module === "CONTACT") moduleColor = "#71a758";

      const summary = getActionSummary(data);

      return (
        <div
          className="tooltip"
          style={{ left: `${left}px`, top: `${top}px`, display: "flex", opacity: 1 }}
        >
          <div className="tooltip-title">{agent.name}</div>
          <div className="tooltip-row">
            <span className="tooltip-label">Operation:</span>
            <span className="tooltip-value" style={{ color: moduleColor, textTransform: "uppercase" }}>{data.module} {data.action}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Time:</span>
            <span className="tooltip-value">{actTimeStr} BST</span>
          </div>
          {summary && (
            <div className="tooltip-row" style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "4px", marginTop: "4px" }}>
              <span className="tooltip-label">Details:</span>
              <span className="tooltip-value" style={{ color: "#e2e8f0", fontStyle: "italic", whiteSpace: "normal", maxWidth: "200px" }}>{summary}</span>
            </div>
          )}
        </div>
      );
    }


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
          <div className="timeline-controls">
            <label>
              <i className="fa-solid fa-hourglass-start"></i> Start:{" "}
              <select
                id="team-start-hour"
                className="mini-select"
                value={startHour}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setStartHour(val);
                  if (val >= endHour) setEndHour(Math.min(24, val + 1));
                }}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {i.toString().padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </label>
            <label>
              <i className="fa-solid fa-hourglass-end"></i> End:{" "}
              <select
                id="team-end-hour"
                className="mini-select"
                value={endHour}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setEndHour(val);
                  if (val <= startHour) setStartHour(Math.max(0, val - 1));
                }}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {(i + 1).toString().padStart(2, "00")}:00
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Legend — Outbound Calls & Operations */}
          <div className="timeline-legend">
            <span className="legend-item">
              <span className="legend-color" style={{ backgroundColor: "#db8324", opacity: 0.85, border: "1px solid rgba(0,0,0,0.2)" }}></span>Outbound Calls
            </span>
            <span className="legend-item">
              <span className="legend-color" style={{ backgroundColor: "#a74a25", opacity: 0.85, border: "1px solid rgba(0,0,0,0.2)" }}></span>Operations
            </span>
          </div>
        </div>
      </div>

      {/* ── Canvas area: sticky names + scrollable chart (No vertical scroll maxHeight) ─────────────────── */}
      <div ref={containerRef} className="timeline-canvas-wrapper">
        {/* Names column (sticky, vertical-scroll synced if needed) */}
        <div
          ref={namesScrollRef}
          className="timeline-names-panel"
          onScroll={handleNamesScroll}
        >
          <canvas ref={namesCanvasRef} style={{ display: "block" }} />
        </div>

        {/* Chart area (horizontal scroll only) */}
        <div
          ref={scrollContainerRef}
          id="timeline-canvas-container"
          className="timeline-chart-panel"
          onScroll={handleChartScroll}
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

