'use client'

import { forwardRef } from 'react'
import * as RadixDialog from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
  trigger?: React.ReactNode
}

const Dialog = forwardRef<HTMLDivElement, DialogProps>(
  ({ open, onOpenChange, title, description, children, className, trigger }, ref) => {
    return (
      <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
        {trigger && <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger>}
        <RadixDialog.Portal>
          <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out" />
          <RadixDialog.Content
            ref={ref}
            className={cn(
              'fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2',
              'glass-strong rounded-xl p-6 shadow-2xl',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              className
            )}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                {title && (
                  <RadixDialog.Title className="text-lg font-display font-semibold text-text-primary">
                    {title}
                  </RadixDialog.Title>
                )}
                {description && (
                  <RadixDialog.Description className="text-sm text-text-secondary mt-1">
                    {description}
                  </RadixDialog.Description>
                )}
              </div>
              <RadixDialog.Close className="rounded-full p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors">
                <X className="h-4 w-4" />
              </RadixDialog.Close>
            </div>
            {children}
          </RadixDialog.Content>
        </RadixDialog.Portal>
      </RadixDialog.Root>
    )
  }
)
Dialog.displayName = 'Dialog'

export { Dialog }
