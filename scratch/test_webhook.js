const http = require("http");

// Helper to make HTTP requests
function makeRequest(options, payloadString) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        resolve({
          status: res.statusCode,
          body: data
        });
      });
    });
    req.on("error", (e) => reject(e));
    if (payloadString) {
      req.write(payloadString);
    }
    req.end();
  });
}

async function runIntegratedTest() {
  const dateStr = "2026-07-27";
  console.log("=== GHL WEBHOOK & CSV IMPORT INTEGRATED TEST ===\n");

  // Step A: Trigger real-time webhook catching for an SMS
  console.log("Step A: Simulating real-time GHL SMS Webhook trigger...");
  const smsPayload = {
    type: "SMS",
    direction: "outbound",
    body: "Hello! This is a live GHL SMS caught in real-time.",
    email: "john.doe@gmail.com",
    contactName: "John Doe",
    contactId: "contact_12345",
    agentName: "Agent 11",
    date: `${dateStr}T15:00:00.000Z`
  };
  
  const smsPayloadStr = JSON.stringify(smsPayload);
  const webhookRes = await makeRequest({
    hostname: "localhost",
    port: 3000,
    path: "/api/webhooks/ghl",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(smsPayloadStr)
    }
  }, smsPayloadStr);
  
  console.log(`Webhook Response Status: ${webhookRes.status}`);
  console.log(`Webhook Response Body: ${webhookRes.body}\n`);

  // Step B: Simulate CSV Import Merging
  console.log("Step B: Simulating CSV Import and merging process...");
  
  // 1. Fetch the existing backup (which contains the SMS from Step A)
  console.log("1. Fetching existing backup from GitHub/filesystem...");
  const fetchRes = await makeRequest({
    hostname: "localhost",
    port: 3000,
    path: `/api/backup?date=${dateStr}`,
    method: "GET"
  });
  
  let existingConversations = [];
  try {
    const fetchedData = JSON.parse(fetchRes.body);
    if (fetchedData.exists && fetchedData.data) {
      existingConversations = fetchedData.data.ghl_outbound_messages || fetchedData.data.ghlMessages || [];
      console.log(`Found ${existingConversations.length} existing conversation messages.`);
    }
  } catch (e) {
    console.warn("No existing backup file found to merge. Initializing new compilation.");
  }

  // 2. Compile new CSV data (e.g. Call logs and Audit logs)
  const compiledCsvData = {
    agents: [
      { name: "Agent 11", calls_placed: 1 }
    ],
    calls: [
      {
        agent: "Agent 11",
        timestamp: `${dateStr}T15:15:00.000Z`,
        contact_name: "John Doe",
        duration: "03:45",
        direction: "outbound",
        status: "Answered"
      }
    ],
    audit_logs: [
      {
        agent: "Agent 11",
        timestamp: `${dateStr}T15:15:00.000Z`,
        module: "CONTACT",
        action: "Call log imported",
        details: "Outbound call to John Doe"
      }
    ]
  };

  // 3. Integrate new CSV data with existing webhook conversations
  const mergedDataToUpload = {
    ...compiledCsvData,
    ghl_outbound_messages: existingConversations,
    ghlMessages: existingConversations
  };

  // 4. Save the fully integrated report to GitHub
  console.log("2. Uploading integrated JSON report back to GitHub...");
  const uploadPayloadStr = JSON.stringify({
    data: mergedDataToUpload,
    date: dateStr
  });
  
  const uploadRes = await makeRequest({
    hostname: "localhost",
    port: 3000,
    path: "/api/backup",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(uploadPayloadStr)
    }
  }, uploadPayloadStr);
  
  console.log(`Upload Response Status: ${uploadRes.status}`);
  console.log(`Upload Response Body: ${uploadRes.body}\n`);

  // Step C: Verify the integrated JSON document
  console.log("Step C: Fetching and verifying the final integrated JSON...");
  const finalFetchRes = await makeRequest({
    hostname: "localhost",
    port: 3000,
    path: `/api/backup?date=${dateStr}`,
    method: "GET"
  });

  console.log("\n=== FINAL INTEGRATED JSON (From GitHub) ===");
  console.log(JSON.stringify(JSON.parse(finalFetchRes.body), null, 2));
}

runIntegratedTest().catch((e) => {
  console.error("Test failed:", e.message);
});
