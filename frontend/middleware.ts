import { NextResponse, type NextRequest } from 'next/server'

const protectedPrefixes = ['/admin', '/customer', '/delivery', '/worker', '/washman', '/ironman-worker', '/notifications']
const authCookieNames = ['ironman_access_token', 'IRONMAN_ACCESS_TOKEN', 'ironman_session']

export function middleware(request: NextRequest) {
  if (request.headers.has('x-middleware-subrequest')) {
    return new NextResponse('Bad request', { status: 400 })
  }

  const pathname = request.nextUrl.pathname
  const isProtected = protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  if (!isProtected) return NextResponse.next()

  const hasAuthCookie = authCookieNames.some((name) => Boolean(request.cookies.get(name)?.value))
  if (!hasAuthCookie) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/customer/:path*',
    '/delivery/:path*',
    '/worker/:path*',
    '/washman/:path*',
    '/ironman-worker/:path*',
    '/notifications/:path*'
  ]
}
