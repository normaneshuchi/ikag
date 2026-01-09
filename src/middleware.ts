import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes and their allowed roles (used for reference, actual role check happens in components)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _protectedRoutes: Record<string, string[]> = {
  "/admin": ["admin"],
  "/provider": ["admin", "provider"],
  "/dashboard": ["admin", "provider", "user"],
};

// Public routes that don't require authentication
const publicRoutes = ["/", "/login", "/register", "/api/auth"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow static files and API routes (except protected ones)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    pathname.includes(".") ||
    pathname === "/~offline"
  ) {
    return NextResponse.next();
  }

  // Check for session cookie (better-auth uses this)
  const sessionCookie = request.cookies.get("better-auth.session_token");

  if (!sessionCookie) {
    // Redirect to login if no session
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // For role-based access, we need to check the role from the session
  // This is a simplified version - in production, you'd verify the session server-side
  // The actual role check happens in the page components after fetching the session

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (icons, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|icons|.*\\..*|api/auth).*)",
  ],
};
