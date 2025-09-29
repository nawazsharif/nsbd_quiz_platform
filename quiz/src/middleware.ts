import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { USER_ROLES } from "@/lib/auth";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // Admin routes
    if (pathname.startsWith('/admin')) {
      if (!token) {
        return NextResponse.redirect(new URL('/auth/signin', req.url));
      }

      const userRole = token.role as string;

      if (userRole !== USER_ROLES.ADMIN && userRole !== USER_ROLES.SUPER_ADMIN) {
        return NextResponse.redirect(new URL('/unauthorized', req.url));
      }

      // Super admin only routes
      if (
        pathname.startsWith('/admin/settings') ||
        pathname.startsWith('/admin/users') ||
        pathname.startsWith('/admin/roles') ||
        pathname.startsWith('/admin/permissions') ||
        pathname.startsWith('/admin/categories')
      ) {
        if (userRole !== USER_ROLES.SUPER_ADMIN && userRole !== USER_ROLES.ADMIN) {
          return NextResponse.redirect(new URL('/unauthorized', req.url));
        }
      }
    }

    // Protected routes that require authentication
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/profile') || pathname.startsWith('/learning')) {
      if (!token) {
        return NextResponse.redirect(new URL('/auth/signin', req.url));
      }
    }

    // Quiz creation routes
    if (pathname.startsWith('/quiz/create') || pathname.startsWith('/course/create')) {
      if (!token) {
        return NextResponse.redirect(new URL('/auth/signin', req.url));
      }

      const userRole = token.role as string;
      if (userRole !== USER_ROLES.USER && userRole !== USER_ROLES.ADMIN && userRole !== USER_ROLES.SUPER_ADMIN) {
        return NextResponse.redirect(new URL('/unauthorized', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to public routes
        const publicRoutes = [
          '/',
          '/auth/signin',
          '/auth/signup',
          '/auth/forgot-password',
          '/auth/reset-password',
          '/auth/error',
          '/unauthorized',
          '/quiz',
          '/course',
          '/about',
          '/contact',
        ];

        const { pathname } = req.nextUrl;

        // Check if it's a public route
        if (publicRoutes.some(route => pathname.startsWith(route))) {
          return true;
        }

        // For all other routes, require authentication
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/profile/:path*',
    '/quiz/create/:path*',
    '/course/create/:path*',
    '/course/builder/:path*',
    '/learning/:path*',
    '/favorites',
  ],
};
