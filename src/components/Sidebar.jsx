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
  availableDates,
  theme,
  toggleTheme,
  handleLogout,
  userRole,
  CustomDatePicker
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
    { id: "ai-assistant", label: "AI Operations", icon: "fa-wand-magic-sparkles" },
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

      {/* Mobile Controls Section: Date Picker, Theme Toggle, Logout */}
      <div className="mobile-sidebar-controls">
        <div style={{ width: "100%", marginBottom: "0.5rem" }}>
          {CustomDatePicker && (
            <CustomDatePicker value={reportDate} onChange={onDateChange} />
          )}
        </div>

        {userRole === "special" && (
          <Link
            href="/upload-data"
            className="mobile-sidebar-action-btn"
            style={{ textDecoration: "none", backgroundColor: "rgba(209, 92, 46, 0.15)", color: "#e26939" }}
          >
            <i className="fa-solid fa-cloud-arrow-up"></i>
            <span>Onboarding Portal</span>
          </Link>
        )}

        <button className="mobile-sidebar-action-btn" onClick={toggleTheme}>
          <i className={`fa-solid ${theme === "dark" ? "fa-sun" : "fa-moon"}`}></i>
          <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
        </button>

        <button className="mobile-sidebar-action-btn logout-btn" onClick={handleLogout} style={{ color: "#e26939" }}>
          <i className="fa-solid fa-right-from-bracket"></i>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
