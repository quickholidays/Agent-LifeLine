import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { endpoint, token, params } = await req.json();

    if (!endpoint || !token) {
      return NextResponse.json({ error: "Missing GHL API endpoint or authorization token" }, { status: 400 });
    }

    // Build the request URL
    const url = new URL(`https://services.leadconnectorhq.com${endpoint}`);
    if (params) {
      Object.keys(params).forEach((key) => {
        if (params[key] !== undefined && params[key] !== null) {
          url.searchParams.append(key, String(params[key]));
        }
      });
    }

    const headers = {
      "Authorization": `Bearer ${token}`,
      "Version": "2021-04-15", // Standard GHL API Version header
      "Accept": "application/json",
      "Content-Type": "application/json"
    };

    const response = await fetch(url.toString(), {
      method: "GET",
      headers
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { error: `GHL API Error (${response.status}): ${errText || response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("GHL Proxy Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
