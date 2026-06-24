'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { ToastProvider } from '@/components/ui/Toast'
import { DemoModeProvider } from '@/components/layout/DemoBanner'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15000,
        refetchInterval: 30000,
        retry: 2,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <DemoModeProvider>
          {children}
        </DemoModeProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}
