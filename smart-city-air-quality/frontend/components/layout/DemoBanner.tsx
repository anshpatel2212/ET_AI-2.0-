'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { initBackendCheck } from '@/lib/api'
import { WifiOff } from 'lucide-react'

interface DemoModeContextType {
  isDemo: boolean
  checking: boolean
}

const DemoModeContext = createContext<DemoModeContextType>({ isDemo: false, checking: true })

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [isDemo, setIsDemo] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    initBackendCheck().then((online) => {
      setIsDemo(!online)
      setChecking(false)
    })
  }, [])

  return (
    <DemoModeContext.Provider value={{ isDemo, checking }}>
      {isDemo && (
        <div className="sticky top-16 z-40 bg-neon-warning/10 border-b border-neon-warning/30 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 py-1.5 flex items-center justify-center gap-2">
            <WifiOff className="h-4 w-4 text-neon-warning flex-shrink-0" />
            <p className="text-xs text-neon-warning font-medium">
              Backend offline — showing demo data. Start the full stack with Docker for live data.
            </p>
          </div>
        </div>
      )}
      {children}
    </DemoModeContext.Provider>
  )
}

export function useDemoMode() {
  return useContext(DemoModeContext)
}