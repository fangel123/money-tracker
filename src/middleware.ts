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

  // 1. Buat objek response dasar terlebih dahulu
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // 2. Inisialisasi Supabase Server Client dengan sinkronisasi cookie ganda (Request & Response)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            }
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            }
          });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // 3. Validasi user sesi aktif
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Auth routes - redirect to dashboard if already logged in
  const isAuthRoute = pathname.match(/^\/[a-z]{2}\/(login|register|forgot-password)/);
  if (isAuthRoute && user) {
    const locale = pathname.split("/")[1];
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  // Protected routes - redirect to login if not authenticated
  const isProtectedRoute = pathname.match(/^\/[a-z]{2}\/(dashboard|transactions|categories|budgets|accounts|settings)/);
  if (isProtectedRoute && !user) {
    const locale = pathname.split("/")[1];
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.webmanifest$|.*\\.ico$|.*\\.png$).*)",
  ],
};