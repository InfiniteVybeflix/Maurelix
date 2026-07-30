import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Public routes
  const publicRoutes = ["/", "/login", "/signup", "/auth/callback", "/auth/confirmed"];
  if (publicRoutes.includes(pathname)) {
    return response;
  }

  // Protected routes
  const protectedRoutes = ["/app", "/admin", "/onboarding"];
  const isProtected = protectedRoutes.some((r) => pathname.startsWith(r));

  if (isProtected) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Use Supabase SSR to check session properly
    const { updateSession } = await import("@/lib/supabase/middleware");
    const sessionResponse = await updateSession(request);

    // Check for auth cookie presence as fallback
    const cookieName = `sb-${supabaseUrl.split("//")[1].split(".")[0]}-auth-token`;
    const authCookie = request.cookies.get(cookieName);

    if (!authCookie) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
