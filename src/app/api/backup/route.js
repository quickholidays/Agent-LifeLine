import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Helper function to fetch and decode JSON content from GitHub contents API (reusing content and falling back to blob API for large files)
async function fetchFileContent(owner, repo, fileName, headers) {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${fileName}`;
  try {
    const response = await fetch(apiUrl, { headers, cache: "no-store" });
    if (!response.ok) {
      return null;
    }
    const fileData = await response.json();
    let base64Content = fileData.content;
    if (!base64Content) {
      // Large file (>1MB), fetch raw blob
      const blobUrl = `https://api.github.com/repos/${owner}/${repo}/git/blobs/${fileData.sha}`;
      const blobResponse = await fetch(blobUrl, { headers, cache: "no-store" });
      if (blobResponse.ok) {
        const blobData = await blobResponse.json();
        base64Content = blobData.content;
      }
    }
    if (!base64Content) return null;
    const cleanBase64 = base64Content.replace(/\s/g, "");
    const decodedContent = Buffer.from(cleanBase64, "base64").toString("utf-8");
    return {
      sha: fileData.sha,
      data: JSON.parse(decodedContent)
    };
  } catch (err) {
    console.error(`Error fetching file content for ${fileName}:`, err);
    return null;
  }
}

export async function POST(req) {
  try {
    const { data, date } = await req.json();

    if (!data || !date) {
      return NextResponse.json({ error: "Missing data or date" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const skipGithub = searchParams.get("skipGithub") === "true";

    // Strip conversation messages from data to isolate core metrics / agent config
    const cleanData = { ...data };
    delete cleanData.ghl_outbound_messages;
    delete cleanData.ghlMessages;

    if (skipGithub) {
      try {
        const localDir = path.join(process.cwd(), "Test-Data");
        if (!fs.existsSync(localDir)) {
          fs.mkdirSync(localDir, { recursive: true });
        }
        const localFile = path.join(localDir, `lifeline_report_${date}.json`);
        const jsonString = JSON.stringify(cleanData, null, 2);
        fs.writeFileSync(localFile, jsonString, "utf-8");
        console.log(`Successfully updated local backup file at: ${localFile}`);
        return NextResponse.json({
          success: true,
          message: `Successfully saved report locally at ${localFile}`
        });
      } catch (err) {
        return NextResponse.json({ error: `Failed to save locally: ${err.message}` }, { status: 500 });
      }
    }

    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;

    if (!token || !owner || !repo) {
      return NextResponse.json(
        { error: "Server GitHub configuration is incomplete. Check environment variables." },
        { status: 500 }
      );
    }

    // Save as daily_backups/YYYY-MM-DD.json
    const fileName = `daily_backups/${date}.json`;
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${fileName}`;

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    };

    let sha = null;

    // Check if the file already exists to get its SHA for update
    try {
      const getResponse = await fetch(apiUrl, { headers, cache: "no-store" });
      if (getResponse.ok) {
        const fileData = await getResponse.json();
        sha = fileData.sha;
      }
    } catch (err) {
      console.log("File does not exist yet, proceeding to create standard new file.");
    }

    // Convert data to JSON string and encode to Base64
    const jsonString = JSON.stringify(cleanData, null, 2);
    const contentBase64 = Buffer.from(jsonString).toString("base64");

    const commitMessage = `Auto-backup for date: ${date}`;
    const putBody = {
      message: commitMessage,
      content: contentBase64,
    };
    
    if (sha) {
      putBody.sha = sha;
    }

    const putResponse = await fetch(apiUrl, {
      method: "PUT",
      headers,
      body: JSON.stringify(putBody),
    });

    if (!putResponse.ok) {
      const errText = await putResponse.text();
      return NextResponse.json(
        { error: `GitHub API Error (${putResponse.status}): ${errText}` },
        { status: putResponse.status }
      );
    }

    const result = await putResponse.json();

    // Also update local copy in Test-Data folder if it exists
    try {
      const localDir = path.join(process.cwd(), "Test-Data");
      if (fs.existsSync(localDir)) {
        const localFile = path.join(localDir, `lifeline_report_${date}.json`);
        fs.writeFileSync(localFile, jsonString, "utf-8");
        console.log(`Successfully updated local backup file at: ${localFile}`);
      }
    } catch (err) {
      console.error("Failed to write local backup file:", err);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully backed up to ${fileName}`,
      sha: result.commit.sha,
    });
  } catch (error) {
    console.error("Backup API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    // 1. If date is requested, check local Test-Data folder first
    if (date) {
      const localDir = path.join(process.cwd(), "Test-Data");
      const localFile = path.join(localDir, `lifeline_report_${date}.json`);
      const localMessagesFile = path.join(localDir, `lifeline_report_messages_${date}.json`);

      if (fs.existsSync(localFile)) {
        try {
          const fileContent = fs.readFileSync(localFile, "utf-8");
          const contentJson = JSON.parse(fileContent);

          // Merge local messages file if it exists
          if (fs.existsSync(localMessagesFile)) {
            const msgsContent = fs.readFileSync(localMessagesFile, "utf-8");
            const msgsJson = JSON.parse(msgsContent);
            const messagesList = msgsJson.ghl_outbound_messages || msgsJson.ghlMessages || [];
            contentJson.ghl_outbound_messages = messagesList;
            contentJson.ghlMessages = messagesList;
          }
          return NextResponse.json({ exists: true, data: contentJson });
        } catch (err) {
          console.error("Failed to read local Test-Data file:", err);
        }
      }
    }

    // 2. Gather local Test-Data file dates (ignoring messages files)
    const localDates = [];
    const localDir = path.join(process.cwd(), "Test-Data");
    if (fs.existsSync(localDir)) {
      try {
        const files = fs.readdirSync(localDir);
        files.forEach(f => {
          if (f.startsWith("lifeline_report_") && f.endsWith(".json") && !f.startsWith("lifeline_report_messages_")) {
            const dt = f.replace("lifeline_report_", "").replace(".json", "");
            if (dt && !localDates.includes(dt)) {
              localDates.push(dt);
            }
          }
        });
      } catch (err) {
        console.error("Failed to list local Test-Data folder:", err);
      }
    }

    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;

    if (!token || !owner || !repo) {
      // Fallback: only return local dates if GitHub config is missing
      if (!date) {
        return NextResponse.json({ dates: localDates });
      }
      return NextResponse.json({ exists: false });
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    // If no date is provided, return a merged list of all backup files (ignoring messages_)
    if (!date) {
      const folderUrl = `https://api.github.com/repos/${owner}/${repo}/contents/daily_backups`;
      const response = await fetch(folderUrl, { headers, cache: "no-store" });
      
      let dates = [...localDates];
      if (response.ok) {
        const files = await response.json();
        const ghDates = files
          .filter(file => file.type === "file" && file.name.endsWith(".json") && !file.name.startsWith("messages_"))
          .map(file => file.name.replace(".json", ""));
        
        ghDates.forEach(d => {
          if (!dates.includes(d)) {
            dates.push(d);
          }
        });
      }
      return NextResponse.json({ dates });
    }

    // Fetch core report file (config, calls, audit logs)
    const coreFileName = `daily_backups/${date}.json`;
    const coreResult = await fetchFileContent(owner, repo, coreFileName, headers);

    if (coreResult) {
      const mainData = coreResult.data;

      // Fetch separate conversation messages file
      const messagesFileName = `daily_backups/messages_${date}.json`;
      const messagesResult = await fetchFileContent(owner, repo, messagesFileName, headers);

      if (messagesResult) {
        const msgsList = messagesResult.data.ghl_outbound_messages || messagesResult.data.ghlMessages || [];
        mainData.ghl_outbound_messages = msgsList;
        mainData.ghlMessages = msgsList;
      }
      // If messagesResult is null, mainData retains whatever it had (backward compatibility)

      return NextResponse.json({ exists: true, data: mainData });
    } else {
      return NextResponse.json({ exists: false });
    }
  } catch (error) {
    console.error("Backup Check API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
