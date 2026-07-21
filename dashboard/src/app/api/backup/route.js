import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { data, date } = await req.json();

    if (!data || !date) {
      return NextResponse.json({ error: "Missing data or date" }, { status: 400 });
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
    const jsonString = JSON.stringify(data, null, 2);
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
