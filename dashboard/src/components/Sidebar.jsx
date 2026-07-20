"use client";

import React from "react";

export default function Sidebar({ activeTab, onTabChange, collapsed, onToggleCollapse }) {
  const menuItems = [
    { id: "upload-data", label: "Upload Data", icon: "fa-cloud-arrow-up" },
    { id: "overview", label: "Overview", icon: "fa-cubes" },
    { id: "activity-graph", label: "Activity Graph", icon: "fa-chart-column" },
    { id: "agent-progress", label: "Agent Progress", icon: "fa-bars-progress" },
    { id: "agent-charts", label: "Progression Charts", icon: "fa-chart-gantt" },
    { id: "ghl-conversations", label: "GHL Conversations", icon: "fa-comments" },
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
