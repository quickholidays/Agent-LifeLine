const http = require("http");

console.log("=== TRIGGERING GHL CRON SYNC ENDPOINT (GET /api/cron/sync) ===");

const options = {
  hostname: "localhost",
  port: 3000,
  path: "/api/cron/sync?tz=BST",
  method: "GET"
};

const req = http.request(options, (res) => {
  let data = "";
  
  res.on("data", (chunk) => {
    data += chunk;
  });
  
  res.on("end", () => {
    console.log(`Response Status: ${res.statusCode}`);
    try {
      const parsed = JSON.parse(data);
      console.log("\nResponse JSON:");
      console.log(JSON.stringify(parsed, null, 2));
      if (parsed.success) {
        console.log("\n✅ SUCCESS! GHL Cron Sync triggered and updated GitHub successfully.");
      } else {
        console.log("\n❌ FAILURE! Sync did not complete successfully.");
      }
    } catch (e) {
      console.log("\nResponse Text (HTML/Error):");
      console.log(data);
      console.log("\n❌ FAILURE! Server response was not valid JSON.");
    }
  });
});

req.on("error", (e) => {
  console.error(`\n❌ Error triggering sync: ${e.message}`);
  console.error("Make sure your Next.js development server is running on port 3000.");
});

req.end();
