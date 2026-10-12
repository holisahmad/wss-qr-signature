import { NextResponse } from 'next/server'
import type { ZodIssue } from 'zod'

/** Successful response wrapper */
export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status })
}

/** Generic error response */
export function apiError(
  code: string,
  message: string,
  status: number,
  details?: unknown
): NextResponse {
  return NextResponse.json(
    { error: { code, message, ...(details !== undefined ? { details } : {}) } },
    { status }
  )
}

/** Zod validation error */
export function apiValidationError(issues: ZodIssue[]): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
    },
    { status: 422 }
  )
}
