import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

type ToastVariant = 'info' | 'success' | 'warning' | 'error'

type ToastAction = {
  label: string
  onClick: () => void
}

type ToastOptions = {
  title: string
  description?: string
  variant?: ToastVariant
  durationMs?: number
  action?: ToastAction
}

type ToastItem = ToastOptions & {
  id: number
}

type ToastContextValue = {
  showToast: (options: ToastOptions) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

const VARIANT_STYLES: Record<ToastVariant, string> = {
  info: 'bg-slate-900 text-white',
  success: 'bg-emerald-600 text-white',
  warning: 'bg-amber-500 text-white',
  error: 'bg-rose-600 text-white'
}

const VARIANT_BORDER: Record<ToastVariant, string> = {
  info: 'border-slate-700',
  success: 'border-emerald-500',
  warning: 'border-amber-400',
  error: 'border-rose-500'
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timersRef = useRef<Record<number, number>>({})

  const removeToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
    const timerId = timersRef.current[id]
    if (timerId) {
      window.clearTimeout(timerId)
      delete timersRef.current[id]
    }
  }, [])

  const showToast = useCallback(
    (options: ToastOptions) => {
      const id = Date.now() + Math.floor(Math.random() * 1000)
      const toast: ToastItem = {
        id,
        title: options.title,
        description: options.description,
        variant: options.variant ?? 'info',
        durationMs: options.durationMs ?? 6000,
        action: options.action
      }

      setToasts((current) => [...current, toast])

      timersRef.current[id] = window.setTimeout(() => {
        removeToast(id)
      }, toast.durationMs)
    },
    [removeToast]
  )

  const contextValue = useMemo<ToastContextValue>(
    () => ({
      showToast
    }),
    [showToast]
  )

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[2000] flex max-w-sm flex-col gap-3">
        {toasts.map((toast) => {
          const variant = toast.variant ?? 'info'
          return (
            <div
              key={toast.id}
              role="alert"
              className={`pointer-events-auto w-full rounded-xl border px-4 py-3 shadow-lg transition ${
                VARIANT_STYLES[variant]
              } ${VARIANT_BORDER[variant]}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold">{toast.title}</p>
                  {toast.description ? (
                    <p className="mt-1 text-sm leading-snug opacity-90">{toast.description}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  className="ml-2 text-sm underline decoration-transparent transition hover:decoration-inherit"
                  aria-label="Dismiss notification"
                >
                  ×
                </button>
              </div>
              {toast.action ? (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      toast.action?.onClick()
                      removeToast(toast.id)
                    }}
                    className="rounded-md border border-white/40 px-3 py-1 text-xs font-semibold transition hover:bg-white/10"
                  >
                    {toast.action.label}
                  </button>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return ctx
}

