const fs = require("fs");
const path = require("path");
const { parseCSV } = require("../src/utils/csvParser");
const { processAgentData } = require("../src/utils/analysisEngine");

function test() {
  const dir = path.join(__dirname, "..", "Test-Data");

  // Read files
  const oppsText = fs.readFileSync(path.join(dir, "opportunities.csv"), "utf-8");
  const callsText = fs.readFileSync(path.join(dir, "call-reporting-2026-07-27_21-55-38.csv"), "utf-8");
  const auditText = fs.readFileSync(path.join(dir, "Export_Audit_Logs__Jul_2026_10_02_PM.csv"), "utf-8");
  const newLeadsText = fs.readFileSync(path.join(dir, "New Leads-2026-07-27_21-55-58.csv"), "utf-8");
  const bookedText = fs.readFileSync(path.join(dir, "Booked Leads -2026-07-27_21-56-14.csv"), "utf-8");
  const apptText = fs.readFileSync(path.join(dir, "Appointment Booked Leads-2026-07-27_21-56-46.csv"), "utf-8");
  const closedText = fs.readFileSync(path.join(dir, "Closed Leads-2026-07-27_21-56-27.csv"), "utf-8");
  const marginText = fs.readFileSync(path.join(dir, "Margin per Agent-2026-07-27_21-56-07.csv"), "utf-8");

  // Parse CSV
  const oppsRows = parseCSV(oppsText).filter(row => {
    const assigned = row.assigned || row.Assigned || row["Assigned user"] || row["Assigned User"] || row["Assigned To"] || row["assignedTo"];
    return assigned && assigned.trim() !== "";
  });
  const callsRows = parseCSV(callsText);
  const auditRows = parseCSV(auditText);
  const newLeadsRows = parseCSV(newLeadsText);
  const bookedRows = parseCSV(bookedText);
  const apptRows = parseCSV(apptText);
  const closedRows = parseCSV(closedText);
  const marginRows = parseCSV(marginText);

  // Compile
  const compiled = processAgentData(
    auditRows,
    oppsRows,
    callsRows,
    newLeadsRows,
    bookedRows,
    apptRows,
    closedRows,
    "2026-07-27",
    30,
    5,
    "BST",
    false,
    [],
    marginRows
  );

  const agentsKeys = Object.keys(compiled.agents);
  console.log("Number of agents compiled:", agentsKeys.length);
  console.log("Agents list compiled:", agentsKeys);
  
  // Check the input parameter mapping in upload-data page.js!
  console.log("\nWhat is saved to GitHub in upload-data page.js?");
}

test();
