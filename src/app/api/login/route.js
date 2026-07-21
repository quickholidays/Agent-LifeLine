import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { username, password } = await req.json();

    const expectedAdminUser = process.env.ADMIN_USERNAME || "admin";
    const expectedAdminPass = process.env.ADMIN_PASSWORD || "password";
    
    const expectedSpecialUser = process.env.SPECIAL_USERNAME || "special";
    const expectedSpecialPass = process.env.SPECIAL_PASSWORD || "specialpass";

    if (username === expectedSpecialUser && password === expectedSpecialPass) {
      const response = NextResponse.json({ success: true, role: "special", token: "special_session" });
      response.cookies.set("userRole", "special", {
        path: "/",
        maxAge: 86400, // 1 day
        sameSite: "lax"
      });
      return response;
    }

    if (username === expectedAdminUser && password === expectedAdminPass) {
      const response = NextResponse.json({ success: true, role: "admin", token: "admin_session" });
      response.cookies.set("userRole", "admin", {
        path: "/",
        maxAge: 86400, // 1 day
        sameSite: "lax"
      });
      return response;
    }

    return NextResponse.json(
      { error: "Invalid username or password" },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
