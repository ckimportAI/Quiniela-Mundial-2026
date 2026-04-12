import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Redirect to onboarding if user has no nickname (except onboarding itself)
    if (
      token &&
      !token.nickname &&
      pathname !== "/onboarding"
    ) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }

    // Redirect away from onboarding if nickname is already set
    if (pathname === "/onboarding" && token?.nickname) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Admin routes require ADMIN role
    if (pathname.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/predicciones/:path*",
    "/perfil/:path*",
    "/admin/:path*",
    "/tabla/:path*",
    "/recargas/:path*",
    "/onboarding",
  ],
};
