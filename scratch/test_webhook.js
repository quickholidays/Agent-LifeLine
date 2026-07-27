const http = require("http");

function sendWebhook(payload) {
  return new Promise((resolve, reject) => {
    const payloadString = JSON.stringify(payload);
    const options = {
      hostname: "localhost",
      port: 3000,
      path: "/api/webhooks/ghl",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payloadString)
      }
    };

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
    req.write(payloadString);
    req.end();
  });
}

async function runTests() {
  console.log("=== RUNNING GHL WEBHOOK VERIFICATION TESTS (SMS ONLY) ===\n");

  // TEST 1: Send Email payload (should be ignored)
  console.log("TEST 1: Sending Outbound Email Webhook (Expected to be ignored)...");
  try {
    const res1 = await sendWebhook({
      type: "Email",
      direction: "outbound",
      body: "This is a test email body. It should be ignored.",
      subject: "Testing Email Ignore",
      email: "test-email@example.com",
      contactName: "Email User",
      contactId: "email_user_123",
      agentName: "Agent 11"
    });
    console.log(`Response Status: ${res1.status}`);
    console.log("Response Body:", res1.body);
    const parsed = JSON.parse(res1.body);
    if (parsed.message && parsed.message.includes("ignored")) {
      console.log("✅ TEST 1 PASSED: Email was successfully ignored.\n");
    } else {
      console.log("❌ TEST 1 FAILED: Email was not ignored.\n");
    }
  } catch (err) {
    console.error("❌ TEST 1 ERROR:", err.message);
  }

  // TEST 2: Send SMS payload (should succeed)
  console.log("TEST 2: Sending Outbound SMS Webhook (Expected to succeed and be saved)...");
  try {
    const res2 = await sendWebhook({
      type: "SMS",
      direction: "outbound",
      body: "Hi! This is a test SMS message sent via GHL webhook. It should be added to Agent 11's conversation list.",
      email: "test-sms-contact@gmail.com",
      contactName: "GHL Webhook SMS Contact",
      contactId: "sms_webhook_test_999",
      agentName: "Agent 11",
      date: "2026-07-27T14:00:00.000Z"
    });
    console.log(`Response Status: ${res2.status}`);
    console.log("Response Body:", res2.body);
    const parsed = JSON.parse(res2.body);
    if (parsed.success && parsed.parsedRecord && parsed.parsedRecord.type === "sms") {
      console.log("✅ TEST 2 PASSED: SMS was successfully processed and saved.\n");
    } else {
      console.log("❌ TEST 2 FAILED: SMS processing failed.\n");
    }
  } catch (err) {
    console.error("❌ TEST 2 ERROR:", err.message);
  }
}

runTests();
