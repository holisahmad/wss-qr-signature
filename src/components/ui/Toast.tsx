'use client'

import { useEffect, type ReactNode } from 'react'
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react'
import { createPortal } from 'react-dom'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastProps {
  message: string
  type: ToastType
  onDismiss: () => void
  autoDismissMs?: number
}

const typeConfig: Record<
  ToastType,
  { icon: ReactNode; className: string; role: string }
> = {
  success: {
    icon: <CheckCircle style={{ width: 16, height: 16 }} aria-hidden="true" />,
    className: 'bg-[#dcfce7] text-[#15803d] border-[#15803d]',
    role: 'status',
  },
  error: {
    icon: <XCircle style={{ width: 16, height: 16 }} aria-hidden="true" />,
    className: 'bg-[#fee2e2] text-[#dc2626] border-[#dc2626]',
    role: 'alert',
  },
  info: {
    icon: <Info style={{ width: 16, height: 16 }} aria-hidden="true" />,
    className: 'bg-blue-50 text-[#1d4ed8] border-[#1d4ed8]',
    role: 'status',
  },
  warning: {
    icon: <AlertTriangle style={{ width: 16, height: 16 }} aria-hidden="true" />,
    className: 'bg-[#fef3c7] text-[#b45309] border-[#b45309]',
    role: 'alert',
  },
}

export function Toast({ message, type, onDismiss, autoDismissMs = 4000 }: ToastProps) {
  const config = typeConfig[type]

  useEffect(() => {
    const timer = setTimeout(onDismiss, autoDismissMs)
    return () => clearTimeout(timer)
  }, [onDismiss, autoDismissMs])

  return createPortal(
    <div
      role={config.role}
      aria-live={type === 'error' || type === 'warning' ? 'assertive' : 'polite'}
      className={[
        'fixed bottom-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded border shadow-md',
        'text-[14px] font-medium max-w-sm',
        config.className,
      ].join(' ')}
    >
      {config.icon}
      <span className="flex-1">{message}</span>
      <button
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="ml-1 p-0.5 rounded opacity-70 hover:opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
      >
        <X style={{ width: 14, height: 14 }} aria-hidden="true" />
      </button>
    </div>,
    document.body
  )
}

// Toast container/manager hook
import { useState, useCallback } from 'react'

interface ToastItem {
  id: string
  message: string
  type: ToastType
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message, type }])
    return id
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  function ToastContainer() {
    return (
      <>
        {toasts.map((t) => (
          <Toast key={t.id} message={t.message} type={t.type} onDismiss={() => dismissToast(t.id)} />
        ))}
      </>
    )
  }

  return { showToast, ToastContainer }
}
