import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { SignInForm } from './SignInForm'

export const metadata = {
  title: 'Sign In — WSS QR Signature',
}

export const instant = false

export default async function SignInPage() {
  // If already authenticated, redirect to admin
  const session = await auth()
  if (session?.user?.id) {
    redirect('/admin')
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[--color-background] px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded bg-[--color-brand] text-white mb-4"
            aria-hidden="true"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="3" height="3" />
              <rect x="19" y="19" width="2" height="2" />
              <rect x="14" y="19" width="2" height="2" />
              <rect x="19" y="14" width="2" height="2" />
            </svg>
          </div>
          <h1 className="text-[20px] font-semibold text-[--color-text-primary]">
            WSS QR Signature
          </h1>
          <p className="mt-1 text-[14px] text-[--color-text-secondary]">
            Document Issuance &amp; Verification System
          </p>
        </div>

        {/* Sign-in card */}
        <div className="bg-[--color-surface] border border-[--color-border] rounded p-6">
          <h2 className="text-[16px] font-semibold text-[--color-text-primary] mb-4">
            Admin Sign In
          </h2>
          <Suspense fallback={null}>
            <SignInForm />
          </Suspense>
        </div>

        <p className="mt-4 text-center text-[12px] text-[--color-muted]">
          Access restricted to authorized administrators only.
        </p>
      </div>
    </main>
  )
}
