import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { locales, defaultLocale } from "@/i18n/routing";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if pathname has locale prefix
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  // Redirect if no locale prefix
  if (!pathnameHasLocale) {
    const locale = defaultLocale;
    return NextResponse.redirect(
      new URL(`/${locale}${pathname}`, request.url)
    );
  }

  // Create Supabase client for auth
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
        },
      },
    }
  );

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Auth routes - redirect to dashboard if already logged in
  const isAuthRoute = pathname.includes("/auth/");
  if (isAuthRoute && user) {
    const locale = pathname.split("/")[1];
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  // Protected routes - redirect to login if not authenticated
  const isProtectedRoute = pathname.match(/^\/[a-z]{2}\/(dashboard|transactions|categories|budgets|accounts|settings)/);
  if (isProtectedRoute && !user) {
    const locale = pathname.split("/")[1];
    return NextResponse.redirect(new URL(`/${locale}/auth/login`, request.url));
  }

  // Update session cookie
  const response = NextResponse.next();
  await supabase.auth.getSession(); // This refreshes the session

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder (static files like .webmanifest, .ico, .png)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.webmanifest$|.*\\.ico$|.*\\.png$).*)",
  ],
};