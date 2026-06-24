'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { SourcePieChart } from '@/components/charts/SourcePieChart'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/Progress'
import { FadeIn } from '@/components/motion/FadeIn'
import { AQILineChart } from '@/components/charts/AQILineChart'
import { INTERVENTION_TYPES } from '@/lib/constants'
import { getInterventions, getSourcesBreakdown, getEffectivenessReport, approveIntervention, rejectIntervention } from '@/lib/api'
import type { InterventionsResponse, SourcesBreakdown, EffectivenessReport } from '@/lib/api'
import { Shield, CheckCircle2, XCircle, TrendingUp, Factory, Car, Construction, Flame, Trees, BarChart3, RefreshCw, AlertCircle } from 'lucide-react'

export default function InterventionsPage() {
  const [queue, setQueue] = useState<InterventionsResponse['queue']>([])
  const [sourceData, setSourceData] = useState<SourcesBreakdown['sources']>([])
  const [effectivenessData, setEffectivenessData] = useState<EffectivenessReport | null>(null)
  const [totalReduction, setTotalReduction] = useState<string>('N/A')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    setError(null)

    const [intResult, srcResult, effResult] = await Promise.all([
      getInterventions(),
      getSourcesBreakdown(),
      getEffectivenessReport(),
    ])

    const errors: string[] = []

    if (intResult.error) errors.push(`Interventions: ${intResult.error}`)
    if (srcResult.error) errors.push(`Sources: ${srcResult.error}`)
    if (effResult.error) errors.push(`Effectiveness: ${effResult.error}`)

    if (intResult.data) {
      setQueue(intResult.data.queue)
      if (intResult.data.total_reduction) setTotalReduction(intResult.data.total_reduction)
    }
    if (srcResult.data) {
      setSourceData(srcResult.data.sources.map((s) => ({
        ...s,
        value: s.percentage ?? s.value,
      })))
    }
    if (effResult.data) {
      setEffectivenessData(effResult.data)
    }

    if (errors.length > 0) {
      setError(errors.join('; '))
    }

    setLoading(false)
  }

  const handleApprove = useCallback(async (id: string) => {
    setQueue((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'approved' } : i)))
    const result = await approveIntervention(id)
    if (result.error) {
      setQueue((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'pending' } : i)))
    }
  }, [])

  const handleReject = useCallback(async (id: string) => {
    setQueue((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'rejected' } : i)))
    const result = await rejectIntervention(id)
    if (result.error) {
      setQueue((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'pending' } : i)))
    }
  }, [])

  const typeIcons: Record<string, any> = {
    traffic: Car,
    industrial: Factory,
    construction: Construction,
    waste_burning: Flame,
    green_cover: Trees,
  }

  function LoadingSkeleton() {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="glass rounded-xl p-8 text-center">
          <RefreshCw className="h-8 w-8 text-neon-primary mx-auto animate-spin mb-3" />
          <p className="text-text-secondary">Loading interventions...</p>
        </div>
      </div>
    )
  }

  function ErrorState() {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="glass rounded-xl p-8 text-center max-w-md">
          <AlertCircle className="h-8 w-8 text-neon-danger mx-auto mb-3" />
          <p className="text-text-primary font-medium mb-2">Unable to load intervention data</p>
          <p className="text-text-secondary text-sm mb-4">{error}</p>
          <button
            onClick={fetchAll}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-neon-primary/20 text-neon-primary border border-neon-primary/30 hover:bg-neon-primary/30 transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto space-y-8">
      <FadeIn direction="up">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-neon-primary" />
            <h1 className="text-2xl font-display font-bold text-text-primary">AI Intervention Engine</h1>
          </div>
          <div className="flex items-center gap-2">
            {!loading && (
              <span className="text-[10px] text-text-secondary mr-2">
                Source: {error ? 'Partial' : 'API'}
              </span>
            )}
            <Badge variant={totalReduction !== 'N/A' ? 'default' : 'unhealthy_sensitive'} className="flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5" /> {totalReduction} reduction
            </Badge>
          </div>
        </div>
      </FadeIn>

      {loading ? (
        <LoadingSkeleton />
      ) : error && queue.length === 0 && sourceData.length === 0 ? (
        <ErrorState />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <FadeIn direction="left" className="lg:col-span-1">
              <Card className="p-4">
                <h3 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
                  Source Attribution
                  <span className="text-[10px] text-text-secondary font-normal">(API)</span>
                </h3>
                {sourceData.length > 0 ? (
                  <SourcePieChart data={sourceData} height={280} />
                ) : (
                  <div className="flex items-center justify-center h-[280px] text-text-secondary text-sm">
                    No source data available
                  </div>
                )}
              </Card>
            </FadeIn>

            <FadeIn direction="right" className="lg:col-span-2">
              <Card className="p-4">
                <h3 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
                  Effectiveness Score
                  <span className="text-[10px] text-text-secondary font-normal">(API)</span>
                </h3>
                <div className="flex items-center gap-6 mb-4">
                  <div className="text-center">
                    <p className="text-3xl font-display font-bold text-neon-primary">
                      {effectivenessData?.overall ?? '-'}%
                    </p>
                    <p className="text-xs text-text-secondary">Overall</p>
                  </div>
                  <Progress
                    value={effectivenessData?.overall ?? 0}
                    color="neon"
                    className="flex-1"
                    showLabel
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {INTERVENTION_TYPES.map((t) => {
                    const score = effectivenessData?.by_type?.[t.id]
                    return (
                      <div key={t.id} className="glass rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                          <span className="text-xs text-text-primary">{t.label}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-display font-bold" style={{ color: t.color }}>
                            {score !== undefined ? score : '-'}%
                          </span>
                          <span className="text-[10px] text-text-secondary">Effectiveness</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            </FadeIn>
          </div>

          <FadeIn direction="up">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-display font-semibold text-text-primary">Intervention Queue</h2>
                <span className="text-[10px] text-text-secondary">Source: API &middot; {queue.length} items</span>
              </div>
              <div className="space-y-3">
                {queue.length === 0 ? (
                  <div className="glass rounded-xl p-8 text-center">
                    <Shield className="h-8 w-8 text-text-secondary mx-auto mb-2" />
                    <p className="text-text-secondary">No interventions in queue</p>
                  </div>
                ) : (
                  queue.map((item, i) => {
                    const Icon = typeIcons[item.type] || Shield
                    const typeConfig = INTERVENTION_TYPES.find((t) => t.id === item.type)
                    return (
                      <motion.div
                        key={item.id}
                        className="glass rounded-xl p-4"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <div className="flex items-start gap-4">
                          <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${typeConfig?.color}15` }}>
                            <Icon className="h-5 w-5" style={{ color: typeConfig?.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-sm font-semibold text-text-primary">{item.location}</h4>
                              <Badge variant={item.status === 'approved' ? 'good' : item.status === 'rejected' ? 'hazardous' : 'unhealthy_sensitive'}>
                                {item.status}
                              </Badge>
                              <span className="text-[10px] px-2 py-0.5 rounded-full border border-neon-primary/20 text-text-secondary">
                                {typeConfig?.label}
                              </span>
                            </div>
                            <p className="text-sm text-text-secondary mb-2">{item.description}</p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-neon-primary" />
                                <span className="text-sm font-mono text-neon-primary font-semibold">{item.impact_score}%</span>
                                <span className="text-[10px] text-text-secondary">Impact Score</span>
                              </div>
                              <div className="flex gap-2">
                                {item.status === 'pending' && (
                                  <>
                                    <Button variant="neon" size="sm" onClick={() => handleApprove(item.id)}>
                                      <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={() => handleReject(item.id)}>
                                      <XCircle className="h-3.5 w-3.5" /> Reject
                                    </Button>
                                  </>
                                )}
                                {item.status === 'approved' && (
                                  <Badge variant="good">Approved</Badge>
                                )}
                                {item.status === 'rejected' && (
                                  <Badge variant="hazardous">Rejected</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })
                )}
              </div>
            </div>
          </FadeIn>
        </>
      )}
    </div>
  )
}
