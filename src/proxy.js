import { NextResponse } from "next/server";

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const userRole = request.cookies.get("userRole")?.value;

  // Paths requiring Admin or Special Role (all dashboard pages and tester tools)
  const isDashboardPage = pathname === "/" || pathname.startsWith("/test-conversation") || pathname.startsWith("/ghl-test");
  // Paths requiring Special Role only (onboarding portal)
  const isOnboardingPage = pathname.startsWith("/upload-data");

  if (isOnboardingPage) {
    if (userRole !== "special") {
      // If role is admin or missing, redirect to home page
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  if (isDashboardPage) {
    if (userRole !== "admin" && userRole !== "special") {
      // If not logged in at all, redirect to homepage login
      if (pathname !== "/") {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - API routes (/api/*)
     * - Next.js static files and image optimization
     * - Public static assets (logo, video, posters, etc)
     */
    "/((?!api/|_next/static|_next/image|logo.png|logo-animation.mp4|hero-poster.jpg|favicon.ico).*)",
  ],
};
