"use client";

import React, { useEffect, useRef } from "react";

export default function PieChart({ dataDict = {}, colors = [], size = 150 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;

    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, size, size);

    const total = Object.values(dataDict).reduce((a, b) => a + b, 0);
    if (total === 0) {
      ctx.fillStyle = "#64748b";
      ctx.font = "12px Outfit";
      ctx.textAlign = "center";
      ctx.fillText("No activity recorded", size / 2, size / 2);
      return;
    }

    let startAngle = -Math.PI / 2;
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 15;

    let colorIdx = 0;
    for (const [key, value] of Object.entries(dataDict)) {
      const sliceAngle = (value / total) * 2 * Math.PI;
      const color = colors[colorIdx % colors.length];
      colorIdx++;

      // Draw slice
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();

      // Border styling (matches dark mode check)
      const isDark = document.body.classList.contains("dark-mode") || !document.body.classList.contains("light-mode");
      ctx.strokeStyle = isDark ? "#1e293b" : "#f1f5f9";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      startAngle += sliceAngle;
    }
  }, [dataDict, colors, size]);

  const total = Object.values(dataDict).reduce((a, b) => a + b, 0);

  return (
    <div className="chart-wrapper" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <canvas ref={canvasRef} />
      <div className="chart-legend" style={{ width: "100%", marginTop: "1rem" }}>
        {total > 0 &&
          Object.entries(dataDict).map(([key, value], idx) => {
            const percentage = (value / total) * 100;
            const color = colors[idx % colors.length];
            return (
              <div key={key} className="legend-row">
                <span className="legend-label-col">
                  <span className="legend-dot" style={{ backgroundColor: color }}></span>
                  {key}
                </span>
                <span className="legend-value-col">
                  {value} ({percentage.toFixed(0)}%)
                </span>
              </div>
            );
          })}
      </div>
    </div>
  );
}
