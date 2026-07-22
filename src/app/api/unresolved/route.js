import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "src/data/unresolved_queries.json");
    if (!fs.existsSync(filePath)) {
      return NextResponse.json([]);
    }
    const content = fs.readFileSync(filePath, "utf-8");
    let queries = [];
    try {
      queries = JSON.parse(content);
    } catch (e) {
      queries = [];
    }
    return NextResponse.json(queries);
  } catch (error) {
    console.error("GET unresolved queries error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
