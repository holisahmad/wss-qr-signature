import { auth } from '@/auth'
import type { Session } from 'next-auth'

/**
 * Get the current server session. Returns null if not authenticated.
 * Thin wrapper around NextAuth auth() for consistent import.
 */
export async function getSession(): Promise<Session | null> {
  return auth()
}

/**
 * Require an authenticated ADMIN session.
 * Throws a Response with the appropriate HTTP status code on failure.
 *
 * Usage in API routes:
 *   const session = await requireAdmin()
 *   // If we reach here, session.user.role === 'ADMIN'
 */
export async function requireAdmin(): Promise<Session> {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Response(
      JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  if (session.user.role !== 'ADMIN') {
    throw new Response(
      JSON.stringify({ error: { code: 'FORBIDDEN', message: 'Admin access required' } }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  return session
}
