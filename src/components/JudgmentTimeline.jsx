"use client";

import React, { useRef, useEffect, useState } from "react";

export default function JudgmentTimeline({ agent, startHour, endHour, reportDate = "2026-07-17" }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [hoveredItem, setHoveredItem] = useState(null); // { type, data, x, y }

  const timelineLeftMargin = 160;
  const timelineRightMargin = 40;
  const timelineTopMargin = 30;
  const timelineBottomMargin = 20;

  const colors = {
    active: "#71a758",
    activeHover: "#5a8646",
    break: "#c9b336",
    primary: "#d15c2e",
    accent: "#a74a25",
    info: "#db8324",
    danger: "#ef4444",
  };

  const getMinTime = () => {
    const [yr, mo, dy] = reportDate.split("-").map(Number);
    return new Date(Date.UTC(yr, mo - 1, dy, startHour, 0, 0));
  };
  const getMaxTime = () => {
    const [yr, mo, dy] = reportDate.split("-").map(Number);
    return new Date(Date.UTC(yr, mo - 1, dy, endHour, 0, 0));
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !agent) return;

    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = containerRef.current.clientWidth;
    const displayHeight = 180;

    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
    ctx.scale(dpr, dpr);

    const isDark = document.body.classList.contains("dark-mode") || !document.body.classList.contains("light-mode");
    ctx.clearRect(0, 0, displayWidth, displayHeight);

    // 1. Draw Axis Hour Grids
    ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)";
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

    // 2. Draw Swimlane Background Bands & Dividers
    const lanes = [
      { label: "Sessions & Breaks", yStart: 25, height: 45, bgColor: isDark ? "rgba(255, 255, 255, 0.01)" : "rgba(0, 0, 0, 0.01)" },
      { label: "GHL Log Actions", yStart: 70, height: 45, bgColor: "transparent" },
      { label: "Calls Timeline", yStart: 115, height: 45, bgColor: isDark ? "rgba(255, 255, 255, 0.01)" : "rgba(0, 0, 0, 0.01)" },
    ];

    lanes.forEach((l) => {
      if (l.bgColor !== "transparent") {
        ctx.fillStyle = l.bgColor;
        ctx.fillRect(0, l.yStart, displayWidth, l.height);
      }

      ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.04)";
      ctx.beginPath();
      ctx.moveTo(0, l.yStart + l.height);
      ctx.lineTo(displayWidth, l.yStart + l.height);
      ctx.stroke();

      ctx.fillStyle = isDark ? "#94a3b8" : "#475569";
      ctx.font = "600 11px Outfit";
      ctx.textAlign = "left";
      ctx.fillText(l.label, 15, l.yStart + l.height / 2 + 4);
    });

    const details = agent.details;

    // ------------------ SWIMLANE 1: Active Work & Breaks ------------------
    const yLane1 = 25 + 45 / 2;

    // Plot Breaks
    details.breaks.forEach((b) => {
      const startX = getX(b.start, displayWidth);
      const endX = getX(b.end, displayWidth);
      const barWidth = Math.max(2, endX - startX);
      const isHoveredBreak = hoveredItem && hoveredItem.type === "break" && hoveredItem.data === b;

      ctx.fillStyle = colors.break;
      ctx.globalAlpha = isHoveredBreak ? 0.45 : 0.22;
      ctx.fillRect(startX, yLane1 - 7, barWidth, 14);
      ctx.globalAlpha = 1.0;
    });

    // Plot Active Blocks
    details.sessions.forEach((s) => {
      const startX = getX(s.start, displayWidth);
      const endX = getX(s.end, displayWidth);
      const barWidth = Math.max(3, endX - startX);
      const isHoveredSession = hoveredItem && hoveredItem.type === "session" && hoveredItem.data === s;

      ctx.fillStyle = isHoveredSession ? colors.activeHover : colors.active;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(startX, yLane1 - 11, barWidth, 22, 4);
      } else {
        ctx.rect(startX, yLane1 - 11, barWidth, 22);
      }
      ctx.fill();
    });

    // ------------------ SWIMLANE 2: Individual GHL Actions (Dots) ------------------
    const yLane2 = 70 + 45 / 2;
    if (details.actions_list) {
      details.actions_list.forEach((act) => {
        const actionX = getX(act.timestamp, displayWidth);
        const isHoveredAction = hoveredItem && hoveredItem.type === "action" && hoveredItem.data === act;

        let dotColor = colors.info;
        if (act.module === "NOTE") dotColor = colors.info;
        else if (act.module === "OPPORTUNITY") dotColor = colors.accent;
        else if (act.module === "CONTACT") dotColor = colors.active;

        ctx.fillStyle = dotColor;
        ctx.beginPath();
        ctx.arc(actionX, yLane2, isHoveredAction ? 7 : 4.5, 0, 2 * Math.PI);
        ctx.fill();

        if (isHoveredAction) {
          ctx.strokeStyle = "white";
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      });
    }

    // ------------------ SWIMLANE 3: Phone Calls ------------------
    const yLane3 = 115 + 45 / 2;
    if (agent.calls) {
      agent.calls.forEach((call) => {
        const callStartX = getX(call.timestamp, displayWidth);
        const durationSecs = parseDurationToSeconds(call.duration);
        const callEndX = getX(new Date(call.timestamp).getTime() + durationSecs * 1000, displayWidth);
        const barWidth = Math.max(8, callEndX - callStartX);
        const isHoveredCall = hoveredItem && hoveredItem.type === "call" && hoveredItem.data === call;

        const isAnswered = call.status === "Answered";
        const callColor = isAnswered ? colors.active : colors.danger;

        ctx.fillStyle = callColor;
        ctx.globalAlpha = isHoveredCall ? 1.0 : 0.75;

        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(callStartX, yLane3 - 8, barWidth, 16, 3);
        } else {
          ctx.rect(callStartX, yLane3 - 8, barWidth, 16);
        }
        ctx.fill();

        ctx.globalAlpha = 1.0;

        if (isHoveredCall) {
          ctx.strokeStyle = "white";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });
    }
  }, [agent, startHour, endHour, hoveredItem]);

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || !agent) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const displayWidth = rect.width;
    const details = agent.details;
    let hovered = null;

    // 1. Check Lane 1 (Sessions & Breaks)
    const yLane1 = 25 + 45 / 2;
    if (y >= 25 && y <= 70) {
      for (const s of details.sessions) {
        const startX = getX(s.start, displayWidth);
        const endX = getX(s.end, displayWidth);
        if (x >= startX - 3 && x <= endX + 3) {
          hovered = {
            type: "session",
            data: s,
            x: e.clientX,
            y: e.clientY,
          };
          break;
        }
      }

      if (!hovered) {
        for (const b of details.breaks) {
          const startX = getX(b.start, displayWidth);
          const endX = getX(b.end, displayWidth);
          if (x >= startX && x <= endX) {
            hovered = {
              type: "break",
              data: b,
              x: e.clientX,
              y: e.clientY,
            };
            break;
          }
        }
      }
    }

    // 2. Check Lane 2 (GHL Actions Dots)
    const yLane2 = 70 + 45 / 2;
    if (!hovered && y >= 70 && y <= 115 && details.actions_list) {
      for (const act of details.actions_list) {
        const actionX = getX(act.timestamp, displayWidth);
        const dist = Math.sqrt((x - actionX) * (x - actionX) + (y - yLane2) * (y - yLane2));
        if (dist <= 8) {
          hovered = {
            type: "action",
            data: act,
            x: e.clientX,
            y: e.clientY,
          };
          break;
        }
      }
    }

    // 3. Check Lane 3 (Phone Calls)
    const yLane3 = 115 + 45 / 2;
    if (!hovered && y >= 115 && y <= 160 && agent.calls) {
      for (const call of agent.calls) {
        const callStartX = getX(call.timestamp, displayWidth);
        const durationSecs = parseDurationToSeconds(call.duration);
        const callEndX = getX(new Date(call.timestamp).getTime() + durationSecs * 1000, displayWidth);
        const barWidth = Math.max(8, callEndX - callStartX);

        if (x >= callStartX && x <= callStartX + barWidth && Math.abs(y - yLane3) <= 8) {
          hovered = {
            type: "call",
            data: call,
            x: e.clientX,
            y: e.clientY,
          };
          break;
        }
      }
    }

    setHoveredItem(hovered);
  };

  const handleMouseLeave = () => {
    setHoveredItem(null);
  };

  const renderTooltip = () => {
    if (!hoveredItem || !agent) return null;

    const { type, data, x, y } = hoveredItem;
    const startStr = formatIsoToTime(data.start || data.timestamp);

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

    if (type === "session") {
      const endStr = formatIsoToTime(data.end);
      const durationStr = formatSecondsToTime(data.duration);
      return (
        <div className="tooltip" style={{ left: `${left}px`, top: `${top}px`, display: "flex", opacity: 1 }}>
          <div className="tooltip-title">{agent.name}</div>
          <div className="tooltip-row">
            <span className="tooltip-label">Type:</span>
            <span className="tooltip-value" style={{ color: colors.active }}>
              Active Session
            </span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Time:</span>
            <span className="tooltip-value">
              {startStr} - {endStr}
            </span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Duration:</span>
            <span className="tooltip-value">{durationStr}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">GHL Actions:</span>
            <span className="tooltip-value">{data.actions_count} ops</span>
          </div>
        </div>
      );
    } else if (type === "break") {
      const endStr = formatIsoToTime(data.end);
      const durationStr = formatSecondsToTime(data.duration);
      return (
        <div className="tooltip" style={{ left: `${left}px`, top: `${top}px`, display: "flex", opacity: 1 }}>
          <div className="tooltip-title">{agent.name}</div>
          <div className="tooltip-row">
            <span className="tooltip-label">Type:</span>
            <span className="tooltip-value" style={{ color: colors.break }}>
              Away / Break
            </span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Time:</span>
            <span className="tooltip-value">
              {startStr} - {endStr}
            </span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Duration:</span>
            <span className="tooltip-value">{durationStr}</span>
          </div>
        </div>
      );
    } else if (type === "action") {
      const summary = getActionSummary(data);
      return (
        <div className="tooltip" style={{ left: `${left}px`, top: `${top}px`, display: "flex", opacity: 1 }}>
          <div className="tooltip-title">{agent.name}</div>
          <div className="tooltip-row">
            <span className="tooltip-label">Type:</span>
            <span className="tooltip-value" style={{ color: colors.info }}>
              GHL Action
            </span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Module:</span>
            <span className="tooltip-value">{data.module}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Action:</span>
            <span className="tooltip-value">{data.action}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Time:</span>
            <span className="tooltip-value">{startStr} UTC</span>
          </div>
          {summary && (
            <div className="tooltip-row" style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "4px", marginTop: "4px" }}>
              <span className="tooltip-label">Details:</span>
              <span className="tooltip-value" style={{ color: "#e2e8f0", fontStyle: "italic", whiteSpace: "normal", maxWidth: "200px" }}>{summary}</span>
            </div>
          )}
        </div>
      );
    } else if (type === "call") {
      const isAnswered = data.status === "Answered";
      return (
        <div className="tooltip" style={{ left: `${left}px`, top: `${top}px`, display: "flex", opacity: 1 }}>
          <div className="tooltip-title">{agent.name}</div>
          <div className="tooltip-row">
            <span className="tooltip-label">Type:</span>
            <span className="tooltip-value" style={{ color: isAnswered ? colors.active : colors.danger }}>
              Phone Call ({data.direction})
            </span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Contact:</span>
            <span className="tooltip-value">{data.contact_name || "Unknown"}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Status:</span>
            <span className="tooltip-value">{data.status}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Duration:</span>
            <span className="tooltip-value">{data.duration}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Time:</span>
            <span className="tooltip-value">{startStr} UTC</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="timeline-container-outer" ref={containerRef}>
      <div className="timeline-container" id="judgment-canvas-container">
        <canvas ref={canvasRef} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} />
      </div>
      {renderTooltip()}
    </div>
  );
}
