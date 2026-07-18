"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Overview from "@/components/Overview";
import TeamTimeline from "@/components/TeamTimeline";
import AgentTable from "@/components/AgentTable";
import AgentDetails from "@/components/AgentDetails";
import ProgressWorkspace from "@/components/ProgressWorkspace";
import ExecutiveReport from "@/components/ExecutiveReport";
import AgentCharts from "@/components/AgentCharts";
import { parseCSV } from "@/utils/csvParser";
import { processAgentData } from "@/utils/analysisEngine";

export default function Home() {
  const [agentsList, setAgentsList] = useState([]);
  const [rawAnalysisData, setRawAnalysisData] = useState({ bstCallsList: [], bstUpdatesList: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Layout Tab Switching: upload-data, overview, activity-graph, agent-progress, executive-report
  const [activeTab, setActiveTab] = useState("upload-data");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [theme, setTheme] = useState("dark");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Dynamic uploads states
  const [showUploads, setShowUploads] = useState(false);
  const [auditFiles, setAuditFiles] = useState([]);
  const [oppsFile, setOppsFile] = useState(null);
  const [callsFile, setCallsFile] = useState(null);
  const [newLeadsFile, setNewLeadsFile] = useState(null);
  const [bookedLeadsFile, setBookedLeadsFile] = useState(null);
  const [apptLeadsFile, setApptLeadsFile] = useState(null);
  const [closedLeadsFile, setClosedLeadsFile] = useState(null);

  const [processStatus, setProcessStatus] = useState("");
  const [isCustomData, setIsCustomData] = useState(false);

  useEffect(() => {
    // Set default body class
    document.body.classList.add("dark-mode");
    document.body.classList.remove("light-mode");

    // Auto collapse sidebar on small viewports
    if (typeof window !== "undefined") {
      if (window.innerWidth <= 1024) {
        setSidebarCollapsed(true);
      }
    }

    // Load initial pre-compiled JSON demo data
    fetch("/agent_analysis_data.json")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to load JSON data");
        }
        return res.json();
      })
      .then((data) => {
        const parsed = Object.entries(data)
          .map(([name, stats]) => {
            // Backfill default values for segmentations and reports metrics
            const seg = stats.segmentations || {
              newLeads: 0,
              bookedLeads: 0,
              apptBookedLeads: 0,
              closedLeads: 0,
              newLeadsToday: 0,
              bookedLeadsToday: 0,
              apptBookedLeadsToday: 0,
            };

            const callMetrics = stats.call_metrics || {
              outboundCount: 0,
              outboundAttended: 0,
              outboundMissed: 0,
              outboundMinutes: 0,
              outboundAvgDuration: 0,
              inboundCount: 0,
              inboundAttended: 0,
              inboundMissed: 0,
              inboundMinutes: 0,
              inboundAvgDuration: 0,
            };

            return {
              name,
              actions: stats.total_actions,
              opps: stats.assigned_opportunities,
              span: stats.workday_span,
              active: stats.active_duration,
              breaks: stats.breaks.length,
              firstAction: new Date(stats.first_action),
              lastAction: new Date(stats.last_action),
              breakDuration: stats.total_break_duration,
              calls: stats.calls || [],
              details: stats,

              // Extra reporting attributes defaults
              segmentations: seg,
              margin_added_today: stats.margin_added_today || 0,
              stage_interested_today: stats.stage_interested_today || 0,
              stage_contacted_today: stats.stage_contacted_today || 0,
              notes_updated_today: stats.notes_updated_today || 0,
              general_conv_rate: stats.general_conv_rate || 0,
              new_leads_today: stats.new_leads_today || 0,
              converted_today: stats.converted_today || 0,
              today_conv_rate: stats.today_conv_rate || 0,
              call_metrics: callMetrics,
            };
          })
          .sort((a, b) => b.actions - a.actions);

        const bstCallsList = [];
        const bstUpdatesList = [];

        Object.entries(data).forEach(([agentName, stats]) => {
          (stats.calls || []).forEach(c => {
            bstCallsList.push({
              agent: agentName,
              time: new Date(c.timestamp),
              direction: c.direction,
              status: c.status,
              duration: c.duration
            });
          });

          (stats.actions_list || []).forEach(act => {
            bstUpdatesList.push({
              agent: agentName,
              time: new Date(act.timestamp),
              module: act.module,
              action: act.action,
              details: act.details || ""
            });
          });
        });

        setAgentsList(parsed);
        setRawAnalysisData({ bstCallsList, bstUpdatesList });
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching agent data:", err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    if (nextTheme === "light") {
      document.body.classList.add("light-mode");
      document.body.classList.remove("dark-mode");
    } else {
      document.body.classList.add("dark-mode");
      document.body.classList.remove("light-mode");
    }
  };

  const readFileText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  const handleBulkFiles = (e) => {
    const files = Array.from(e.target.files);
    const identifiedAudits = [];
    let identifiedOpps = oppsFile;
    let identifiedCalls = callsFile;
    let identifiedNew = newLeadsFile;
    let identifiedBooked = bookedLeadsFile;
    let identifiedAppt = apptLeadsFile;
    let identifiedClosed = closedLeadsFile;

    files.forEach((file) => {
      const name = file.name.toLowerCase();
      if (name.includes("opportunity") || name.includes("opportunities")) {
        identifiedOpps = file;
      } else if (
        name.includes("call-report") ||
        name.includes("call report") ||
        name.includes("call_report") ||
        name.includes("call logs") ||
        name.includes("call log")
      ) {
        identifiedCalls = file;
      } else if (name.includes("new leads") || name.includes("new_leads")) {
        identifiedNew = file;
      } else if (
        name.includes("appointment booked") ||
        name.includes("appt booked") ||
        name.includes("appointment_booked")
      ) {
        identifiedAppt = file;
      } else if (
        name.includes("booked leads") ||
        name.includes("booked_leads") ||
        name.includes("booked")
      ) {
        if (!name.includes("appointment")) {
          identifiedBooked = file;
        }
      } else if (name.includes("closed leads") || name.includes("closed_leads")) {
        identifiedClosed = file;
      } else {
        identifiedAudits.push(file);
      }
    });

    if (identifiedAudits.length > 0) setAuditFiles(identifiedAudits);
    if (identifiedOpps) setOppsFile(identifiedOpps);
    if (identifiedCalls) setCallsFile(identifiedCalls);
    if (identifiedNew) setNewLeadsFile(identifiedNew);
    if (identifiedBooked) setBookedLeadsFile(identifiedBooked);
    if (identifiedAppt) setApptLeadsFile(identifiedAppt);
    if (identifiedClosed) setClosedLeadsFile(identifiedClosed);
    
    setProcessStatus(`Identified: GHL logs: ${identifiedAudits.length}, Opps: ${identifiedOpps ? "yes" : "no"}, Calls: ${identifiedCalls ? "yes" : "no"}, Segments: ${[identifiedNew, identifiedBooked, identifiedAppt, identifiedClosed].filter(Boolean).length}`);
  };

  const processUploadedFiles = async () => {
    if (auditFiles.length === 0) return;
    setProcessStatus("Reading files...");

    try {
      // 1. GHL audit logs
      const auditRows = [];
      for (const file of auditFiles) {
        const text = await readFileText(file);
        const rows = parseCSV(text);
        auditRows.push(...rows);
      }

      // 2. Opportunities Master
      let oppsRows = [];
      if (oppsFile) {
        const text = await readFileText(oppsFile);
        oppsRows = parseCSV(text);
      }

      // 3. Call report
      let callsRows = [];
      if (callsFile) {
        const text = await readFileText(callsFile);
        callsRows = parseCSV(text);
      }

      // 4. Lead segmentations
      let newLeadsRows = [];
      if (newLeadsFile) {
        const text = await readFileText(newLeadsFile);
        newLeadsRows = parseCSV(text);
      }

      let bookedRows = [];
      if (bookedLeadsFile) {
        const text = await readFileText(bookedLeadsFile);
        bookedRows = parseCSV(text);
      }

      let apptRows = [];
      if (apptLeadsFile) {
        const text = await readFileText(apptLeadsFile);
        apptRows = parseCSV(text);
      }

      let closedRows = [];
      if (closedLeadsFile) {
        const text = await readFileText(closedLeadsFile);
        closedRows = parseCSV(text);
      }

      setProcessStatus("Processing CRM statistics & standardizing to BST...");

      const processed = processAgentData(
        auditRows,
        oppsRows,
        callsRows,
        newLeadsRows,
        bookedRows,
        apptRows,
        closedRows
      );

      setRawAnalysisData(processed);

      const parsed = Object.entries(processed.agents)
        .map(([name, stats]) => {
          return {
            name,
            actions: stats.total_actions,
            opps: stats.assigned_opportunities,
            span: stats.workday_span,
            active: stats.active_duration,
            breaks: stats.breaks.length,
            firstAction: stats.first_action ? new Date(stats.first_action) : null,
            lastAction: stats.last_action ? new Date(stats.last_action) : null,
            breakDuration: stats.total_break_duration,
            calls: stats.calls || [],
            details: stats,

            segmentations: stats.segmentations,
            margin_added_today: stats.margin_added_today,
            stage_interested_today: stats.stage_interested_today,
            stage_contacted_today: stats.stage_contacted_today,
            notes_updated_today: stats.notes_updated_today,
            general_conv_rate: stats.general_conv_rate,
            new_leads_today: stats.new_leads_today,
            converted_today: stats.converted_today,
            today_conv_rate: stats.today_conv_rate,
            call_metrics: stats.call_metrics,
          };
        })
        .sort((a, b) => b.actions - a.actions);

      if (parsed.length === 0) {
        throw new Error(
          "No agent records parsed. Make sure audit logs contain 'Modified By (Name)' headers."
        );
      }

      setAgentsList(parsed);
      setIsCustomData(true);
      setSelectedAgent(null);
      setProcessStatus(`Processed ${parsed.length} agents successfully!`);
      setTimeout(() => setShowUploads(false), 2000);
    } catch (err) {
      console.error(err);
      setProcessStatus(`Import error: ${err.message}`);
    }
  };

  const resetToDemoData = () => {
    setLoading(true);
    setError(null);
    setAuditFiles([]);
    setOppsFile(null);
    setCallsFile(null);
    setNewLeadsFile(null);
    setBookedLeadsFile(null);
    setApptLeadsFile(null);
    setClosedLeadsFile(null);
    setProcessStatus("");

    fetch("/agent_analysis_data.json")
      .then((res) => res.json())
      .then((data) => {
        const parsed = Object.entries(data)
          .map(([name, stats]) => {
            const seg = stats.segmentations || {
              newLeads: 0,
              bookedLeads: 0,
              apptBookedLeads: 0,
              closedLeads: 0,
              newLeadsToday: 0,
              bookedLeadsToday: 0,
              apptBookedLeadsToday: 0,
            };
            const callMetrics = stats.call_metrics || {
              outboundCount: 0,
              outboundAttended: 0,
              outboundMissed: 0,
              outboundMinutes: 0,
              outboundAvgDuration: 0,
              inboundCount: 0,
              inboundAttended: 0,
              inboundMissed: 0,
              inboundMinutes: 0,
              inboundAvgDuration: 0,
            };

            return {
              name,
              actions: stats.total_actions,
              opps: stats.assigned_opportunities,
              span: stats.workday_span,
              active: stats.active_duration,
              breaks: stats.breaks.length,
              firstAction: new Date(stats.first_action),
              lastAction: new Date(stats.last_action),
              breakDuration: stats.total_break_duration,
              calls: stats.calls || [],
              details: stats,

              segmentations: seg,
              margin_added_today: stats.margin_added_today || 0,
              stage_interested_today: stats.stage_interested_today || 0,
              stage_contacted_today: stats.stage_contacted_today || 0,
              notes_updated_today: stats.notes_updated_today || 0,
              general_conv_rate: stats.general_conv_rate || 0,
              new_leads_today: stats.new_leads_today || 0,
              converted_today: stats.converted_today || 0,
              today_conv_rate: stats.today_conv_rate || 0,
              call_metrics: callMetrics,
            };
          })
          .sort((a, b) => b.actions - a.actions);

        const bstCallsList = [];
        const bstUpdatesList = [];

        Object.entries(data).forEach(([agentName, stats]) => {
          (stats.calls || []).forEach(c => {
            bstCallsList.push({
              agent: agentName,
              time: new Date(c.timestamp),
              direction: c.direction,
              status: c.status,
              duration: c.duration
            });
          });

          (stats.actions_list || []).forEach(act => {
            bstUpdatesList.push({
              agent: agentName,
              time: new Date(act.timestamp),
              module: act.module,
              action: act.action,
              details: act.details || ""
            });
          });
        });

        setAgentsList(parsed);
        setRawAnalysisData({ bstCallsList, bstUpdatesList });
        setIsCustomData(false);
        setSelectedAgent(null);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  const filteredAgents = agentsList.filter((agent) =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderActiveTab = () => {
    switch (activeTab) {
      case "upload-data":
        return (
          <div className="tab-content" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <section className="card" style={{ padding: "2.5rem" }}>
              <div style={{ marginBottom: "2rem" }}>
                <h2 style={{ fontSize: "1.3rem", display: "flex", alignItems: "center", gap: "0.6rem", fontWeight: 800 }}>
                  <i className="fa-solid fa-cloud-arrow-up" style={{ color: "var(--primary)" }}></i> LifeLine Datasets Onboarding
                </h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginTop: "0.4rem" }}>
                  Please upload your CRM report files to standardize timezone conversions and generate dashboard metrics.
                </p>
              </div>

              {/* Bulk All-in-One Upload Area */}
              <div
                style={{
                  border: "2px dashed var(--primary)",
                  borderRadius: "12px",
                  padding: "2.5rem 1.5rem",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.6rem",
                  background: "rgba(209, 92, 46, 0.03)",
                  marginBottom: "1.5rem",
                }}
              >
                <i className="fa-solid fa-folder-open" style={{ fontSize: "2.5rem", color: "var(--primary)" }}></i>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700 }}>All-in-One Bulk Document Upload</h3>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: "0 auto", maxWidth: "600px" }}>
                  Select or drag all your CRM documents at once. We'll automatically identify opportunities, calls, audit logs, and lead segmentations!
                </p>
                <input
                  type="file"
                  multiple
                  accept=".csv"
                  onChange={handleBulkFiles}
                  style={{ display: "none" }}
                  id="bulk-file-upload-input"
                />
                <label
                  htmlFor="bulk-file-upload-input"
                  className="btn-primary-small"
                  style={{ alignSelf: "center", marginTop: "0.5rem", padding: "0.65rem 1.5rem", cursor: "pointer", fontSize: "0.88rem" }}
                >
                  <i className="fa-solid fa-plus"></i> Select All Files At Once
                </label>
              </div>

              {/* Identified Summary Status */}
              {(auditFiles.length > 0 || oppsFile || callsFile || newLeadsFile || bookedLeadsFile || apptLeadsFile || closedLeadsFile) && (
                <div
                  style={{
                    background: "var(--bg-color)",
                    border: "1px solid var(--card-border)",
                    borderRadius: "8px",
                    padding: "1.2rem 1.5rem",
                    fontSize: "0.82rem",
                    marginBottom: "1.5rem",
                  }}
                >
                  <h4 style={{ fontWeight: 700, marginBottom: "0.6rem" }}>
                    <i className="fa-solid fa-circle-info"></i> Mapped Bulk Files:
                  </h4>
                  <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.5rem", listStyle: "none", padding: 0 }}>
                    <li>
                      GHL Agent Logs:{" "}
                      <strong style={{ color: auditFiles.length > 0 ? "var(--success)" : "var(--text-secondary)" }}>
                        {auditFiles.length > 0 ? `✓ ${auditFiles.length} files` : "Missing"}
                      </strong>
                    </li>
                    <li>
                      Opportunities Master:{" "}
                      <strong style={{ color: oppsFile ? "var(--success)" : "var(--text-secondary)" }}>
                        {oppsFile ? `✓ ${oppsFile.name}` : "Missing"}
                      </strong>
                    </li>
                    <li>
                      Call Report Log:{" "}
                      <strong style={{ color: callsFile ? "var(--success)" : "var(--text-secondary)" }}>
                        {callsFile ? `✓ ${callsFile.name}` : "Missing"}
                      </strong>
                    </li>
                    <li>
                      New Leads Segmentation:{" "}
                      <strong style={{ color: newLeadsFile ? "var(--success)" : "var(--text-secondary)" }}>
                        {newLeadsFile ? `✓ ${newLeadsFile.name}` : "Missing"}
                      </strong>
                    </li>
                    <li>
                      Booked Leads:{" "}
                      <strong style={{ color: bookedLeadsFile ? "var(--success)" : "var(--text-secondary)" }}>
                        {bookedLeadsFile ? `✓ ${bookedLeadsFile.name}` : "Missing"}
                      </strong>
                    </li>
                    <li>
                      Appt Booked Leads:{" "}
                      <strong style={{ color: apptLeadsFile ? "var(--success)" : "var(--text-secondary)" }}>
                        {apptLeadsFile ? `✓ ${apptLeadsFile.name}` : "Missing"}
                      </strong>
                    </li>
                    <li>
                      Closed Leads:{" "}
                      <strong style={{ color: closedLeadsFile ? "var(--success)" : "var(--text-secondary)" }}>
                        {closedLeadsFile ? `✓ ${closedLeadsFile.name}` : "Missing"}
                      </strong>
                    </li>
                  </ul>
                </div>
              )}

              {/* Progress and trigger options */}
              <div
                style={{
                  display: "flex",
                  gap: "1rem",
                  alignItems: "center",
                  flexWrap: "wrap",
                  borderTop: "1px solid var(--card-border)",
                  paddingTop: "1.5rem",
                }}
              >
                <button
                  className="btn-primary-small"
                  onClick={processUploadedFiles}
                  disabled={auditFiles.length === 0}
                  style={{
                    opacity: auditFiles.length === 0 ? 0.5 : 1,
                    cursor: auditFiles.length === 0 ? "not-allowed" : "pointer",
                    padding: "0.65rem 1.5rem",
                    fontSize: "0.85rem",
                  }}
                >
                  <i className="fa-solid fa-gears"></i> Process and Compile Workspace
                </button>

                {isCustomData && (
                  <button
                    className="btn-primary-small"
                    onClick={resetToDemoData}
                    style={{
                      backgroundColor: "rgba(239, 68, 68, 0.15)",
                      color: "var(--danger)",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      padding: "0.65rem 1.5rem",
                      fontSize: "0.85rem",
                    }}
                  >
                    <i className="fa-solid fa-rotate-left"></i> Reset to Default Data
                  </button>
                )}

                {processStatus && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem" }}>
                    <i className="fa-solid fa-circle-notch fa-spin" style={{ color: "var(--primary)" }}></i>
                    <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>{processStatus}</span>
                  </div>
                )}

                {isCustomData && !processStatus && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--success)", fontWeight: 600 }}>
                    <i className="fa-solid fa-circle-check"></i>
                    <span>Workspace ready! Click the tabs in the left sidebar to explore dashboards & KPIs.</span>
                  </div>
                )}
              </div>

              {/* Individual Override Grid */}
              <div style={{ marginTop: "2.5rem", borderTop: "1px solid var(--card-border)", paddingTop: "1.5rem" }}>
                <h4 style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "1rem", color: "var(--text-secondary)" }}>
                  Individual Override Inputs (optional):
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem" }}>
                  {/* 1. GHL Logs */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                      1. GHL Audit Logs (multiple):
                    </label>
                    <div className="custom-file-input-wrapper">
                      <input
                        type="file"
                        multiple
                        accept=".csv"
                        onChange={(e) => setAuditFiles(Array.from(e.target.files))}
                      />
                      <div className="custom-file-label" style={{ borderLeft: "3px solid var(--primary)" }}>
                        <i className="fa-solid fa-file-csv"></i>{" "}
                        {auditFiles.length > 0 ? `${auditFiles.length} logs chosen` : "Choose Audit Logs..."}
                      </div>
                    </div>
                  </div>

                  {/* 2. Opportunities */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                      2. Opportunities Database:
                    </label>
                    <div className="custom-file-input-wrapper">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => setOppsFile(e.target.files[0] || null)}
                      />
                      <div className="custom-file-label" style={{ borderLeft: "3px solid var(--info)" }}>
                        <i className="fa-solid fa-database"></i>{" "}
                        {oppsFile ? oppsFile.name : "Choose Opportunities..."}
                      </div>
                    </div>
                  </div>

                  {/* 3. Call Logs */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                      3. Call Report Log:
                    </label>
                    <div className="custom-file-input-wrapper">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => setCallsFile(e.target.files[0] || null)}
                      />
                      <div className="custom-file-label" style={{ borderLeft: "3px solid var(--warning)" }}>
                        <i className="fa-solid fa-phone"></i>{" "}
                        {callsFile ? callsFile.name : "Choose Call Report..."}
                      </div>
                    </div>
                  </div>

                  {/* 4. New Leads */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                      4. New Leads Segmentation:
                    </label>
                    <div className="custom-file-input-wrapper">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => setNewLeadsFile(e.target.files[0] || null)}
                      />
                      <div className="custom-file-label" style={{ borderLeft: "3px solid var(--info)" }}>
                        <i className="fa-solid fa-user-plus"></i>{" "}
                        {newLeadsFile ? newLeadsFile.name : "Choose New Leads..."}
                      </div>
                    </div>
                  </div>

                  {/* 5. Booked Leads */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                      5. Booked Leads:
                    </label>
                    <div className="custom-file-input-wrapper">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => setBookedLeadsFile(e.target.files[0] || null)}
                      />
                      <div className="custom-file-label" style={{ borderLeft: "3px solid var(--success)" }}>
                        <i className="fa-solid fa-calendar-check"></i>{" "}
                        {bookedLeadsFile ? bookedLeadsFile.name : "Choose Booked..."}
                      </div>
                    </div>
                  </div>

                  {/* 6. Appt Booked Leads */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                      6. Appt Booked Leads:
                    </label>
                    <div className="custom-file-input-wrapper">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => setApptLeadsFile(e.target.files[0] || null)}
                      />
                      <div className="custom-file-label" style={{ borderLeft: "3px solid var(--warning)" }}>
                        <i className="fa-solid fa-calendar-days"></i>{" "}
                        {apptLeadsFile ? apptLeadsFile.name : "Choose Appt Booked..."}
                      </div>
                    </div>
                  </div>

                  {/* 7. Closed Leads */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                      7. Closed Leads:
                    </label>
                    <div className="custom-file-input-wrapper">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => setClosedLeadsFile(e.target.files[0] || null)}
                      />
                      <div className="custom-file-label" style={{ borderLeft: "3px solid var(--danger)" }}>
                        <i className="fa-solid fa-circle-xmark"></i>{" "}
                        {closedLeadsFile ? closedLeadsFile.name : "Choose Closed..."}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        );
      case "overview":
        return <Overview agents={agentsList} stageChanges={rawAnalysisData.stageChangesToday} />;
      case "activity-graph":
        return (
          <div className="tab-content" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <TeamTimeline
              agents={filteredAgents}
              selectedAgent={selectedAgent}
              onSelectAgent={(agent) => setSelectedAgent(agent)}
            />

            <div className="dashboard-split" style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap", width: "100%" }}>
              <div style={{ flex: 1.3, minWidth: "300px", display: "flex", flexDirection: "column" }}>
                <div
                  className="card"
                  style={{
                    marginBottom: "1rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "1rem 1.5rem",
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Filters</h3>
                  <div className="search-box" style={{ margin: 0 }}>
                    <i className="fa-solid fa-magnifying-glass search-icon"></i>
                    <input
                      type="text"
                      placeholder="Search agents..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <AgentTable
                  agents={filteredAgents}
                  selectedAgent={selectedAgent}
                  onSelectAgent={(agent) => setSelectedAgent(agent)}
                />
              </div>

              <div style={{ flex: 1, minWidth: "300px", display: "flex", flexDirection: "column" }}>
                <AgentDetails agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
              </div>
            </div>
          </div>
        );
      case "agent-progress":
        return <ProgressWorkspace agents={agentsList} />;
      case "agent-charts":
        return <AgentCharts agents={agentsList} />;
      case "exec-conversion":
      case "exec-sprints":
      case "exec-calls":
      case "exec-timeline":
      case "exec-export":
        return (
          <ExecutiveReport
            agents={agentsList}
            bstCallsList={rawAnalysisData.bstCallsList}
            bstUpdatesList={rawAnalysisData.bstUpdatesList}
            activeSection={activeTab}
          />
        );
      default:
        return <Overview agents={agentsList} />;
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", fontFamily: "Outfit, sans-serif" }}>
        <h2>Loading Agent Performance Data...</h2>
        <p style={{ marginTop: "1rem", color: "var(--text-secondary)" }}>Fetching data feed</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", fontFamily: "Outfit, sans-serif" }}>
        <h2 style={{ color: "var(--danger)" }}>Error Loading Dashboard Data</h2>
        <p style={{ marginTop: "1rem", color: "var(--text-secondary)" }}>{error}</p>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* Mobile Sidebar Backdrop Overlay */}
      {!sidebarCollapsed && (
        <div
          className="mobile-sidebar-backdrop"
          onClick={() => setSidebarCollapsed(true)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 1050
          }}
        />
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (typeof window !== "undefined" && window.innerWidth <= 1024) {
            setSidebarCollapsed(true);
          }
        }}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content Area */}
      <main className="main-content-area">
        <header>
          <div className="logo-area" style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="mobile-hamburger"
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
                color: "var(--text-primary)",
                width: "2.3rem",
                height: "2.3rem",
                borderRadius: "8px",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: "1.1rem",
                boxShadow: "var(--shadow)",
                flexShrink: 0
              }}
            >
              <i className="fa-solid fa-bars"></i>
            </button>
            <h2 style={{ margin: 0, textTransform: "capitalize" }}>
              {activeTab.replace("-", " ")} Workspace
            </h2>
          </div>
          <div className="header-controls">
            <span className="date-badge">
              <i className="fa-regular fa-calendar"></i> July 17, 2026
            </span>
            <button
              id="theme-toggle"
              className="btn-theme"
              title="Toggle Light/Dark Mode"
              onClick={toggleTheme}
            >
              <i className={`fa-solid ${theme === "dark" ? "fa-moon" : "fa-sun"}`}></i>
            </button>
          </div>
        </header>

        {/* Tab content panel */}
        {renderActiveTab()}
      </main>
    </div>
  );
}
