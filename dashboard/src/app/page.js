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
import ConversationsWorkspace from "@/components/ConversationsWorkspace";
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
  const [theme, setTheme] = useState("light");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showHero, setShowHero] = useState(true);

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
  const [processingState, setProcessingState] = useState(null);
  const [ghlToken, setGhlToken] = useState("");
  const [ghlLocationId, setGhlLocationId] = useState("");

  const handleGhlTokenChange = (val) => {
    setGhlToken(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("ghl_token", val);
    }
  };

  const handleGhlLocationChange = (val) => {
    setGhlLocationId(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("ghl_location", val);
    }
  };

  useEffect(() => {
    // Set default body class
    document.body.classList.add("light-mode");
    document.body.classList.remove("dark-mode");

    // Load credentials from local storage
    if (typeof window !== "undefined") {
      setGhlToken(localStorage.getItem("ghl_token") || "");
      setGhlLocationId(localStorage.getItem("ghl_location") || "");
    }

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

    // Initialize processing steps
    const steps = [
      { id: "read-audit", name: `Parsing ${auditFiles.length} GHL Agent Log file(s)`, status: "processing" },
      { id: "read-opps", name: "Parsing CRM Opportunities Master", status: "pending" },
      { id: "read-calls", name: "Parsing Call Report Logs", status: "pending" },
      { id: "read-segments", name: "Parsing Lead Segmentation files", status: "pending" },
      { id: "align-bst", name: "Standardizing activity timelines to BST", status: "pending" },
      { id: "compile", name: "Compiling metrics & building dashboard layout", status: "pending" }
    ];

    setProcessingState({
      steps,
      progressPercent: 5,
    });

    try {
      // Step 1: Read Audit Logs
      await new Promise(resolve => setTimeout(resolve, 600)); // allow UI to render first
      const auditRows = [];
      for (const file of auditFiles) {
        const text = await readFileText(file);
        const rows = parseCSV(text);
        auditRows.push(...rows);
      }

      // Update after Step 1
      steps[0].status = "done";
      steps[1].status = "processing";
      setProcessingState({
        steps: [...steps],
        progressPercent: 20
      });

      // Step 2: Read Opportunities Master
      await new Promise(resolve => setTimeout(resolve, 500));
      let oppsRows = [];
      if (oppsFile) {
        const text = await readFileText(oppsFile);
        oppsRows = parseCSV(text);
      }

      // Update after Step 2
      steps[1].status = "done";
      steps[2].status = "processing";
      setProcessingState({
        steps: [...steps],
        progressPercent: 40
      });

      // Step 3: Read Call report
      await new Promise(resolve => setTimeout(resolve, 500));
      let callsRows = [];
      if (callsFile) {
        const text = await readFileText(callsFile);
        callsRows = parseCSV(text);
      }

      // Update after Step 3
      steps[2].status = "done";
      steps[3].status = "processing";
      setProcessingState({
        steps: [...steps],
        progressPercent: 60
      });

      // Step 4: Lead segmentations
      await new Promise(resolve => setTimeout(resolve, 500));
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

      // Update after Step 4
      steps[3].status = "done";
      steps[4].status = "processing";
      setProcessingState({
        steps: [...steps],
        progressPercent: 75
      });

      // Step 5: BST Alignment & compile data
      await new Promise(resolve => setTimeout(resolve, 600));
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

      // Update after Step 5
      steps[4].status = "done";
      steps[5].status = "processing";
      setProcessingState({
        steps: [...steps],
        progressPercent: 90
      });

      // Step 6: Map to final structured agent objects
      await new Promise(resolve => setTimeout(resolve, 600));
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

      // Complete
      steps[5].status = "done";
      setProcessingState({
        steps: [...steps],
        progressPercent: 100
      });

      await new Promise(resolve => setTimeout(resolve, 800)); // let user see 100% complete
      setProcessingState(null); // close loader
      setShowUploads(false); // return to dashboard
    } catch (err) {
      console.error(err);
      // Mark active step as error
      const activeStep = steps.find(s => s.status === "processing");
      if (activeStep) activeStep.status = "error";
      
      setProcessingState(prev => prev ? {
        ...prev,
        error: err.message
      } : null);
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

              {/* GoHighLevel API Integration Credentials */}
              <div
                style={{
                  background: "rgba(209, 92, 46, 0.02)",
                  border: "1px solid var(--card-border)",
                  borderRadius: "12px",
                  padding: "1.5rem",
                  marginBottom: "2rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem"
                }}
              >
                <h3 style={{ fontSize: "1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <i className="fa-solid fa-key" style={{ color: "var(--primary)" }}></i> GoHighLevel API Credentials
                </h3>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>
                  Configure your GoHighLevel Location ID and Private Integration Key to sync live conversation messages and logs automatically.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.2rem", marginTop: "0.2rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, marginBottom: "0.4rem", color: "var(--text-secondary)" }}>
                      Location ID
                    </label>
                    <input
                      type="text"
                      value={ghlLocationId}
                      onChange={(e) => handleGhlLocationChange(e.target.value)}
                      placeholder="e.g. gCr3FJTylSWPTvuQjR6V"
                      style={{
                        width: "100%",
                        padding: "0.55rem 0.8rem",
                        borderRadius: "8px",
                        background: "var(--input-bg)",
                        border: "1px solid var(--input-border)",
                        color: "var(--text-primary)",
                        fontSize: "0.82rem",
                        outline: "none"
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, marginBottom: "0.4rem", color: "var(--text-secondary)" }}>
                      Private Integration Key (Access Token)
                    </label>
                    <input
                      type="password"
                      value={ghlToken}
                      onChange={(e) => handleGhlTokenChange(e.target.value)}
                      placeholder="pit-xxxxxx..."
                      style={{
                        width: "100%",
                        padding: "0.55rem 0.8rem",
                        borderRadius: "8px",
                        background: "var(--input-bg)",
                        border: "1px solid var(--input-border)",
                        color: "var(--text-primary)",
                        fontSize: "0.82rem",
                        outline: "none"
                      }}
                    />
                  </div>
                </div>
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
      case "ghl-conversations":
        return <ConversationsWorkspace agents={agentsList} />;
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

  // ── Hero Landing Page ─────────────────────────────────────────────────────
  // Loading runs in background while hero shows — no blocking loading screen
  if (showHero) {
    return (
      <div className="hero-root hero-dark">

        {/* Video background — poster is actual first frame of the video */}
        <div className="hero-video-wrap">
          <img src="/hero-poster-dark.jpg" alt="" className="hero-poster" aria-hidden="true" />
          <video
            className="hero-video"
            src="/bg-video.mp4"
            poster="/hero-poster-dark.jpg"
            autoPlay
            muted
            loop
            playsInline
            preload="none"
          />
          <div className="hero-video-overlay" />
        </div>

        {/* Centred content */}
        <div className="hero-content">
          {/* Logo */}
          <img
            src="/logo.png"
            alt="LifeLine Logo"
            style={{
              height: "120px",
              width: "auto",
              marginBottom: "0.5rem",
              filter: "drop-shadow(0 8px 24px rgba(209, 92, 46, 0.25))"
            }}
          />

          <h1 className="hero-headline">
            LifeLine
            <span className="hero-headline-accent"> Agent Tracking</span>
          </h1>

          <p className="hero-subheadline">
            The premium GoHighLevel activity workspace. Know exactly what your agents are doing — every action, every call, every moment of the working day.
          </p>

          <button
            id="hero-enter-btn"
            className="hero-cta-btn"
            onClick={() => setShowHero(false)}
          >
            <span>{loading ? "Preparing Workspace…" : "Enter Workspace"}</span>
            <i className={`fa-solid ${loading ? "fa-spinner fa-spin" : "fa-arrow-right hero-cta-icon"}`} />
          </button>
        </div>
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

      {/* Compiling datasets loader overlay */}
      {processingState && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "520px",
              padding: "2.5rem 2rem",
              background: "#0a0a0a",
              border: "1px solid var(--card-border)",
              borderRadius: "16px",
              boxShadow: "0 24px 48px rgba(0, 0, 0, 0.6)",
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
              fontFamily: "var(--font-stack)",
              color: "#faefea"
            }}
          >
            {/* Header */}
            <div style={{ textAlign: "center" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0 }}>
                Compiling LifeLine Workspace
              </h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.4rem", margin: 0 }}>
                Processing agent activity logs and CRM segmentations...
              </p>
            </div>

            {/* Circular Progress & Percentage */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.6rem" }}>
              {/* Progress Bar Container */}
              <div
                style={{
                  width: "100%",
                  height: "8px",
                  background: "rgba(255, 255, 255, 0.08)",
                  borderRadius: "999px",
                  overflow: "hidden",
                  position: "relative"
                }}
              >
                <div
                  style={{
                    width: `${processingState.progressPercent}%`,
                    height: "100%",
                    background: "var(--primary)",
                    borderRadius: "999px",
                    transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
                  }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", width: "100%", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                <span>Progress</span>
                <strong style={{ color: "var(--primary)", fontWeight: 800 }}>{processingState.progressPercent}%</strong>
              </div>
            </div>

            {/* Checklist of Steps */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.03)", borderRadius: "10px", padding: "1.2rem 1.2rem" }}>
              {processingState.steps.map((step) => {
                let icon = <i className="fa-regular fa-circle" style={{ color: "var(--text-secondary)", opacity: 0.5 }}></i>;
                let textColor = "rgba(250, 239, 234, 0.4)";

                if (step.status === "processing") {
                  icon = <i className="fa-solid fa-spinner fa-spin" style={{ color: "var(--primary)" }}></i>;
                  textColor = "#faefea";
                } else if (step.status === "done") {
                  icon = <i className="fa-solid fa-circle-check" style={{ color: "var(--success)" }}></i>;
                  textColor = "rgba(250, 239, 234, 0.85)";
                } else if (step.status === "error") {
                  icon = <i className="fa-solid fa-circle-xmark" style={{ color: "var(--danger)" }}></i>;
                  textColor = "var(--danger)";
                }

                return (
                  <div key={step.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.82rem", color: textColor, transition: "all 0.3s ease" }}>
                    <div style={{ fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center", width: "20px", height: "20px" }}>
                      {icon}
                    </div>
                    <span style={{ fontWeight: step.status === "processing" ? 700 : 400 }}>{step.name}</span>
                  </div>
                );
              })}
            </div>

            {/* Error Message & Close Button */}
            {processingState.error && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "0.5rem" }}>
                <div style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "8px", padding: "0.8rem 1rem", fontSize: "0.78rem", color: "var(--danger)", lineHeight: 1.4 }}>
                  <i className="fa-solid fa-triangle-exclamation"></i> <strong>Processing Failed:</strong> {processingState.error}
                </div>
                <button
                  className="ghl-btn btn-red"
                  onClick={() => setProcessingState(null)}
                  style={{
                    alignSelf: "center",
                    padding: "0.5rem 1.5rem",
                    borderRadius: "8px",
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    color: "var(--danger)",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    fontWeight: 700
                  }}
                >
                  Dismiss & Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
