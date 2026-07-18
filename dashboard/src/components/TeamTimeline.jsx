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

        const label =
          drawDate.getUTCHours().toString().padStart(2, "0") +
          ":" +
          drawDate.getUTCMinutes().toString().padStart(2, "0");
        ctx.fillText(label, xVal, timelineTopMargin - 15);
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

      // ── Active Sessions (green bars) ──────────────────────────────────
      details.sessions.forEach((s) => {
        const startX = getX(s.start, displayWidth);
        const endX = getX(s.end, displayWidth);
        const barWidth = Math.max(3, endX - startX);
        const isHoveredSession =
          hoveredItem &&
          hoveredItem.type === "session" &&
          hoveredItem.data === s &&
          hoveredItem.agent.name === agent.name;

        ctx.fillStyle = isHoveredSession ? colors.activeHover : colors.active;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(startX, yCenter - 10, barWidth, 20, 4);
        } else {
          ctx.rect(startX, yCenter - 10, barWidth, 20);
        }
        ctx.fill();

        ctx.strokeStyle = isDark
          ? "rgba(15, 23, 42, 0.4)"
          : "rgba(255,255,255,0.4)";
        ctx.lineWidth = 0.8;
        ctx.stroke();
      });

      // ── Call markers ──────────────────────────────────────────────────
      const agentCalls = agent.calls || [];
      agentCalls.forEach((c) => {
        const callTime = new Date(c.timestamp);
        if (callTime >= getMinTime() && callTime <= getMaxTime()) {
          const xVal = getX(callTime, displayWidth);
          const isHoveredCall =
            hoveredItem &&
            hoveredItem.type === "call" &&
            hoveredItem.data === c &&
            hoveredItem.agent.name === agent.name;

          let callColor = "#db8324";
          if (c.status !== "Answered") {
            callColor = "#ef4444";
          } else if (c.direction === "inbound") {
            callColor = "#71a758";
          }

          ctx.fillStyle = callColor;
          ctx.fillRect(xVal - 1.5, yCenter - 10, 3, 20);

          ctx.strokeStyle = isHoveredCall ? "white" : "rgba(255,255,255,0.6)";
          ctx.lineWidth = isHoveredCall ? 1 : 0.5;
          ctx.strokeRect(xVal - 1.5, yCenter - 10, 3, 20);
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
    // Account for vertical scroll inside the chart pane
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

    // Sessions
    for (const s of details.sessions) {
      const startX = getX(s.start, displayWidth);
      const endX = getX(s.end, displayWidth);
      if (x >= startX - 3 && x <= endX + 3 && Math.abs(y - yCenter) <= 12) {
        hovered = { agent, type: "session", data: s, x: e.clientX, y: e.clientY };
        break;
      }
    }

    // Calls
    if (!hovered) {
      const calls = agent.calls || [];
      for (const c of calls) {
        const callTime = new Date(c.timestamp);
        if (callTime >= getMinTime() && callTime <= getMaxTime()) {
          const xVal = getX(callTime, canvasWidth);
          if (Math.abs(x - xVal) <= 6 && Math.abs(y - yCenter) <= 10) {
            hovered = { agent, type: "call", data: c, x: e.clientX, y: e.clientY };
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

    if (type === "call") {
      const callTime = new Date(data.timestamp);
      const callTimeStr =
        callTime.getUTCHours().toString().padStart(2, "00") +
        ":" +
        callTime.getUTCMinutes().toString().padStart(2, "00");
      return (
        <div
          className="tooltip"
          style={{ left: `${x + 15}px`, top: `${y + 15}px`, display: "flex", opacity: 1 }}
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

    const startStr = formatIsoToTime(data.start);
    const endStr = formatIsoToTime(data.end);
    const durationStr = formatSecondsToTime(data.duration);

    return (
      <div
        className="tooltip"
        style={{ left: `${x + 15}px`, top: `${y + 15}px`, display: "flex", opacity: 1 }}
      >
        <div className="tooltip-title">{agent.name}</div>
        <div className="tooltip-row">
          <span className="tooltip-label">State:</span>
          <span className="tooltip-value" style={{ color: "#86efac" }}>Active Work</span>
        </div>
        <div className="tooltip-row">
          <span className="tooltip-label">Time:</span>
          <span className="tooltip-value">{startStr} – {endStr}</span>
        </div>
        <div className="tooltip-row">
          <span className="tooltip-label">Duration:</span>
          <span className="tooltip-value">{durationStr}</span>
        </div>
        <div className="tooltip-row">
          <span className="tooltip-label">Actions:</span>
          <span className="tooltip-value">{data.actions_count} operations</span>
        </div>
      </div>
    );
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

          {/* Legend — only Active Work & Calls */}
          <div className="timeline-legend">
            <span className="legend-item">
              <span className="legend-color legend-active"></span>Active Work
            </span>
            <span className="legend-item">
              <span className="legend-color" style={{ backgroundColor: "#db8324", opacity: 0.85, border: "1px solid rgba(0,0,0,0.2)" }}></span>Calls
            </span>
          </div>
        </div>
      </div>

      {/* ── Canvas area: sticky names + scrollable chart ─────────────────── */}
      <div ref={containerRef} className="timeline-canvas-wrapper">
        {/* Names column (sticky, vertical-scroll synced) */}
        <div
          ref={namesScrollRef}
          className="timeline-names-panel"
          onScroll={handleNamesScroll}
          style={{ maxHeight: `${MAX_VISIBLE_HEIGHT}px` }}
        >
          <canvas ref={namesCanvasRef} style={{ display: "block" }} />
        </div>

        {/* Chart area (horizontal + vertical scroll) */}
        <div
          ref={scrollContainerRef}
          id="timeline-canvas-container"
          className="timeline-chart-panel"
          onScroll={handleChartScroll}
          style={{ maxHeight: `${MAX_VISIBLE_HEIGHT}px` }}
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
