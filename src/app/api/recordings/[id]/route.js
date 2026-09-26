import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const isDownload = searchParams.get("download") === "true";

    if (!id) {
      return NextResponse.json({ error: "Missing recording/message ID" }, { status: 400 });
    }

    const ghlToken = process.env.GHL_TOKEN || process.env.NEXT_PUBLIC_GHL_TOKEN;
    const locationId = process.env.GHL_LOCATION_ID || process.env.NEXT_PUBLIC_GHL_LOCATION_ID;

    if (!ghlToken || !locationId) {
      return NextResponse.json({ error: "GHL credentials missing in configuration" }, { status: 500 });
    }

    const ghlUrl = `https://services.leadconnectorhq.com/conversations/messages/${id}/locations/${locationId}/recording`;

    const ghlRes = await fetch(ghlUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${ghlToken}`,
        Version: "2021-04-15",
      },
    });

    if (ghlRes.status === 404) {
      return NextResponse.json({ error: "Recording not found for this call event" }, { status: 404 });
    }

    if (!ghlRes.ok) {
      const errText = await ghlRes.text();
      return NextResponse.json(
        { error: `GHL Recording API Error (${ghlRes.status}): ${errText}` },
        { status: ghlRes.status }
      );
    }

    const contentType = ghlRes.headers.get("content-type") || "audio/x-wav";
    const arrayBuffer = await ghlRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      return NextResponse.json({ error: "Recording audio file is empty" }, { status: 404 });
    }

    let ext = "wav";
    if (contentType.includes("mpeg") || contentType.includes("mp3")) {
      ext = "mp3";
    }

    const disposition = isDownload
      ? `attachment; filename="recording-${id}.${ext}"`
      : `inline; filename="recording-${id}.${ext}"`;

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": disposition,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "public, max-age=86400, immutable",
        "Accept-Ranges": "bytes",
      },
    });
  } catch (error) {
    console.error("[Recordings ID Stream] Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
