const fs = require("fs");
const path = require("path");

function inspect() {
  const filePath = path.join(__dirname, "..", "Test-Data", "lifeline_report_2026-07-27.json");
  if (!fs.existsSync(filePath)) {
    console.log("No report file found at", filePath);
    return;
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const report = JSON.parse(content);

  console.log("Report Summary:", report.summary);
  console.log("Agents Type:", Array.isArray(report.agents) ? "Array" : typeof report.agents);
  
  if (Array.isArray(report.agents)) {
    console.log("Agents count:", report.agents.length);
    console.log("Agents list:", report.agents.map(a => a.name));
    console.log("First agent details keys:", Object.keys(report.agents[0] || {}));
  } else if (report.agents) {
    console.log("Agents count (dict):", Object.keys(report.agents).length);
    console.log("Agents list (dict):", Object.keys(report.agents));
  } else {
    console.log("No agents key found!");
  }
}

inspect();
