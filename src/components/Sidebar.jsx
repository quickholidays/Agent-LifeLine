"use client";

import React from "react";
import Link from "next/link";

export default function Sidebar({
  activeTab,
  onTabChange,
  collapsed,
  onToggleCollapse,
  reportDate,
  onDateChange,
  availableDates
}) {
  const menuItems = [
    { id: "overview", label: "Overview", icon: "fa-cubes" },
    { id: "activity-metrics", label: "Activity & Metrics", icon: "fa-chart-line" },
    { id: "agent-progress", label: "Agent Progress", icon: "fa-bars-progress" },
    { id: "agent-charts", label: "Progression Charts", icon: "fa-chart-gantt" },
    { id: "exec-conversion", label: "Agent Conversion", icon: "fa-file-invoice" },
    { id: "exec-sprints", label: "Lead Sprints", icon: "fa-running" },
    { id: "exec-calls", label: "Call Analytics", icon: "fa-phone-volume" },
    { id: "exec-timeline", label: "Scatter Timeline", icon: "fa-timeline" },
    { id: "exec-export", label: "Export Centre", icon: "fa-file-export" },
  ];

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <button className="sidebar-toggle-btn" onClick={onToggleCollapse}>
        <i className={`fa-solid ${collapsed ? "fa-chevron-right" : "fa-chevron-left"}`}></i>
      </button>

      <div className="sidebar-header" style={{ gap: "0.55rem" }}>
        <img src="/logo.png" alt="LifeLine Logo" style={{ height: "26px", width: "auto", flexShrink: 0 }} />
        <span className="sidebar-logo-text">LifeLine</span>
      </div>

      <nav className="sidebar-menu">
        {menuItems.map((item) => (
          <div
            key={item.id}
            className={`sidebar-menu-item ${activeTab === item.id ? "active" : ""}`}
            onClick={() => onTabChange(item.id)}
          >
            <i className={`fa-solid ${item.icon}`}></i>
            <span className="sidebar-item-label">{item.label}</span>
          </div>
        ))}
      </nav>

    </aside>
  );
}
