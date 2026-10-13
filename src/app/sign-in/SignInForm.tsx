'use client'

import { useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/admin'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email: email.trim(),
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password.')
      } else {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="px-3 py-2.5 rounded border border-[#dc2626] bg-[#fee2e2] text-[14px] text-[#dc2626]"
        >
          {error}
        </div>
      )}

      <Input
        label="Email address"
        type="email"
        name="email"
        id="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="admin@example.com"
      />

      <Input
        label="Password"
        type="password"
        name="password"
        id="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
      />

      <Button
        type="submit"
        variant="primary"
        size="md"
        loading={loading}
        className="w-full mt-1"
      >
        Sign In
      </Button>
    </form>
  )
}
