/**
 * In-memory sliding window rate limiter.
 * Resets on server restart; sufficient for MVP.
 */

interface Window {
  count: number
  resetAt: number
}

export class RateLimiter {
  private readonly store = new Map<string, Window>()

  /**
   * Returns true if the request should be allowed, false if rate-limited.
   * @param ip - Client IP address
   * @param limit - Max requests per window
   * @param windowMs - Window size in milliseconds
   */
  check(ip: string, limit: number, windowMs: number): boolean {
    const now = Date.now()
    const existing = this.store.get(ip)

    if (!existing || now >= existing.resetAt) {
      // New window
      this.store.set(ip, { count: 1, resetAt: now + windowMs })
      return true
    }

    if (existing.count >= limit) {
      return false
    }

    existing.count += 1
    return true
  }

  /** Clear expired entries to avoid unbounded memory growth */
  cleanup(): void {
    const now = Date.now()
    for (const [key, win] of this.store.entries()) {
      if (now >= win.resetAt) {
        this.store.delete(key)
      }
    }
  }
}

/** Singleton for public endpoints: 20 req/min per IP */
export const publicRateLimiter = new RateLimiter()

/** Extract IP from request headers, falling back to a placeholder */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return 'unknown'
}
