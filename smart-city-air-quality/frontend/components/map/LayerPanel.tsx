'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Layers, Eye, EyeOff } from 'lucide-react'

interface LayerConfig {
  id: string
  label: string
  enabled: boolean
  color?: string
}

interface LayerPanelProps {
  layers: LayerConfig[]
  onToggle: (id: string) => void
  className?: string
}

export function LayerPanel({ layers, onToggle, className }: LayerPanelProps) {
  return (
    <motion.div
      className={cn('glass rounded-xl p-4 min-w-[200px]', className)}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Layers className="h-4 w-4 text-neon-primary" />
        <span className="text-sm font-medium text-text-primary">Layers</span>
      </div>
      <div className="space-y-2">
        {layers.map((layer) => (
          <button
            key={layer.id}
            onClick={() => onToggle(layer.id)}
            className="flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-neon-primary/5 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              {layer.color && (
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: layer.color }} />
              )}
              <span className="text-sm text-text-secondary">{layer.label}</span>
            </div>
            {layer.enabled ? (
              <Eye className="h-3.5 w-3.5 text-neon-primary" />
            ) : (
              <EyeOff className="h-3.5 w-3.5 text-text-secondary/50" />
            )}
          </button>
        ))}
      </div>
    </motion.div>
  )
}
