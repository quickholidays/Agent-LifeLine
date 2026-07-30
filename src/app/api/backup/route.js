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

    // Strip conversation messages from data to isolate core metrics / agent config
    const cleanData = { ...data };
    delete cleanData.ghl_outbound_messages;
    delete cleanData.ghlMessages;

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

    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;

    if (!token || !owner || !repo) {
      return NextResponse.json(
        { error: "Server GitHub configuration is incomplete. Check environment variables." },
        { status: 500 }
      );
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    // If no date is provided, return a list of all backup files from GitHub
    if (!date) {
      const folderUrl = `https://api.github.com/repos/${owner}/${repo}/contents/daily_backups`;
      const response = await fetch(folderUrl, { headers, cache: "no-store" });
      
      let dates = [];
      if (response.ok) {
        const files = await response.json();
        dates = files
          .filter(file => file.type === "file" && file.name.endsWith(".json") && !file.name.startsWith("messages_"))
          .map(file => file.name.replace(".json", ""));
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

      return NextResponse.json({ exists: true, data: mainData });
    } else {
      return NextResponse.json({ exists: false });
    }
  } catch (error) {
    console.error("Backup Check API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
