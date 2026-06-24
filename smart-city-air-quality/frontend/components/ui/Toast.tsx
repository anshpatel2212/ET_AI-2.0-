'use client'

import { forwardRef, createContext, useContext, useState, useCallback } from 'react'
import * as RadixToast from '@radix-ui/react-toast'
import { cn } from '@/lib/utils'
import { X, AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react'

interface Toast {
  id: string
  title: string
  description?: string
  type?: 'success' | 'error' | 'warning' | 'info'
}

interface ToastContextType {
  addToast: (toast: Omit<Toast, 'id'>) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const colors = {
  success: 'border-neon-primary text-neon-primary',
  error: 'border-neon-danger text-neon-danger',
  warning: 'border-neon-warning text-neon-warning',
  info: 'border-neon-secondary text-neon-secondary',
}

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { ...toast, id }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      <RadixToast.Provider swipeDirection="right">
        {children}
        {toasts.map((toast) => {
          const Icon = icons[toast.type || 'info']
          return (
            <RadixToast.Root
              key={toast.id}
              className={cn(
                'glass rounded-lg p-4 shadow-lg border-l-4',
                colors[toast.type || 'info'],
                'data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-swipe-out'
              )}
              onOpenChange={(open) => { if (!open) removeToast(toast.id) }}
            >
              <div className="flex items-start gap-3">
                <Icon className="h-5 w-5 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <RadixToast.Title className="text-sm font-medium text-text-primary">
                    {toast.title}
                  </RadixToast.Title>
                  {toast.description && (
                    <RadixToast.Description className="text-xs text-text-secondary mt-1">
                      {toast.description}
                    </RadixToast.Description>
                  )}
                </div>
                <RadixToast.Close className="shrink-0 text-text-secondary hover:text-text-primary transition-colors">
                  <X className="h-4 w-4" />
                </RadixToast.Close>
              </div>
            </RadixToast.Root>
          )
        })}
        <RadixToast.Viewport className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  )
}

export { ToastProvider }
