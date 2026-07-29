import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);
  const { pathname } = request.nextUrl;

  const protectedRoutes = ["/app", "/admin", "/onboarding"];
  const isProtected = protectedRoutes.some((r) => pathname.startsWith(r));

  if (isProtected) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    const authCookie = request.cookies.get(`sb-${supabaseUrl.split("//")[1].split(".")[0]}-auth-token`);
    if (!authCookie) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  if (pathname === "/admin") {
    return response;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
