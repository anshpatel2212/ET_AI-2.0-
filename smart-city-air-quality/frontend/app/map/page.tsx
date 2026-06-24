'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { PollutionMap } from '@/components/map/PollutionMap'
import { FadeIn } from '@/components/motion/FadeIn'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Map, Search, SlidersHorizontal, Clock, Layers } from 'lucide-react'

export default function MapPage() {
  const [timeIndex, setTimeIndex] = useState(12)
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto space-y-6">
      <FadeIn direction="up">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Map className="h-6 w-6 text-neon-primary" />
            <h1 className="text-2xl font-display font-bold text-text-primary">Smart City Map</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <input
                type="text"
                placeholder="Search area..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9 pr-3 rounded-lg border border-neon-primary/20 bg-bg-secondary/50 text-sm text-text-primary placeholder:text-text-secondary/50 backdrop-blur-sm focus:border-neon-primary focus:outline-none w-48"
              />
            </div>
            <Badge variant="default" className="flex items-center gap-1">
              <Layers className="h-3 w-3" /> 8 layers
            </Badge>
          </div>
        </div>
      </FadeIn>

      <FadeIn direction="up" delay={0.1}>
        <PollutionMap />
      </FadeIn>

      <FadeIn direction="up" delay={0.2}>
        <div className="glass rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-neon-primary" />
              <span className="text-sm font-medium text-text-primary">Time Scrubber</span>
            </div>
            <span className="text-xs font-mono text-text-secondary">
              {new Date(Date.now() - (24 - timeIndex) * 3600000).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={24}
            value={timeIndex}
            onChange={(e) => setTimeIndex(Number(e.target.value))}
            className="w-full h-1.5 bg-bg-tertiary rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neon-primary [&::-webkit-slider-thumb]:shadow-neon-sm"
          />
          <div className="flex justify-between text-[10px] text-text-secondary mt-1">
            <span>-24h</span>
            <span>Now</span>
          </div>
        </div>
      </FadeIn>
    </div>
  )
}
