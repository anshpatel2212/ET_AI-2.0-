'use client'

import { forwardRef } from 'react'
import * as RadixTabs from '@radix-ui/react-tabs'
import { cn } from '@/lib/utils'

interface TabsProps {
  value: string
  onValueChange: (value: string) => void
  tabs: { value: string; label: string }[]
  className?: string
  contentClassName?: string
  children?: React.ReactNode
}

const Tabs = forwardRef<HTMLDivElement, TabsProps>(
  ({ value, onValueChange, tabs, className, contentClassName, children }, ref) => {
    return (
      <RadixTabs.Root value={value} onValueChange={onValueChange} className={cn('w-full', className)} ref={ref}>
        <RadixTabs.List className="flex border-b border-neon-primary/20 overflow-x-auto">
          {tabs.map((tab) => (
            <RadixTabs.Trigger
              key={tab.value}
              value={tab.value}
              className={cn(
                'px-4 py-2.5 text-sm font-medium text-text-secondary transition-all duration-300',
                'hover:text-neon-primary hover:border-b-2 hover:border-neon-primary/50',
                'radix-state-active:text-neon-primary radix-state-active:border-b-2 radix-state-active:border-neon-primary',
                'focus:outline-none focus:ring-2 focus:ring-neon-primary/30 focus:ring-inset',
                'whitespace-nowrap'
              )}
            >
              {tab.label}
            </RadixTabs.Trigger>
          ))}
        </RadixTabs.List>
        {tabs.map((tab) => (
          <RadixTabs.Content key={tab.value} value={tab.value} className={cn('pt-4', contentClassName)}>
            {children || null}
          </RadixTabs.Content>
        ))}
      </RadixTabs.Root>
    )
  }
)
Tabs.displayName = 'Tabs'

const TabsContent = forwardRef<HTMLDivElement, { value: string; children: React.ReactNode; className?: string }>(
  ({ value, children, className }, ref) => (
    <RadixTabs.Content value={value} className={cn('focus:outline-none', className)} ref={ref}>
      {children}
    </RadixTabs.Content>
  )
)
TabsContent.displayName = 'TabsContent'

export { Tabs, TabsContent }
