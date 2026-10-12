import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { RateLimiter } from '@/lib/rate-limit'

/** Separate rate limiter for public verify pages: 60 req/min per IP */
const verifyRateLimiter = new RateLimiter()

function getIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return 'unknown'
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Rate-limit all /verify/* routes — 60 req/min per IP
  if (pathname.startsWith('/verify/')) {
    const ip = getIp(req)
    const allowed = verifyRateLimiter.check(ip, 60, 60_000)
    if (!allowed) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests' }),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }
  }

  // Protect all /admin/* routes
  if (pathname.startsWith('/admin')) {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
    })

    if (!token?.id) {
      const signInUrl = new URL('/sign-in', req.url)
      signInUrl.searchParams.set('callbackUrl', req.url)
      return NextResponse.redirect(signInUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/verify/:path*'],
}
