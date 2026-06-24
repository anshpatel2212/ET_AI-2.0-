'use client'

import { useEffect, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { cn, aqiColor } from '@/lib/utils'
import * as d3 from 'd3'

interface CalendarHeatmapProps {
  data: { date: string; value: number }[]
  className?: string
  days?: number
}

export function CalendarHeatmap({ data, className, days = 365 }: CalendarHeatmapProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  const processedData = useMemo(() => {
    const now = new Date()
    const startDate = new Date(now.getTime() - days * 86400000)
    const dateMap = new Map(data.map((d) => [d.date.slice(0, 10), d.value]))

    const result = []
    for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10)
      result.push({
        date: new Date(d),
        value: dateMap.get(key) || 0,
      })
    }
    return result
  }, [data, days])

  useEffect(() => {
    if (!svgRef.current || !processedData.length) { return }
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    const w = svgRef.current.clientWidth || 800
    const h = 140
    const cellSize = 14
    const cellGap = 3
    svg.attr('viewBox', `0 0 ${w} ${h}`)
    const g = svg.append('g').attr('transform', 'translate(40, 20)')
    const colorScale = (v: number) => v === 0 ? 'rgba(15,31,61,0.4)' : aqiColor(v)
    const tooltip = d3.select('body').append('div').attr('class', 'glass').style('position', 'absolute').style('padding', '8px 12px').style('border-radius', '8px').style('font-size', '12px').style('pointer-events', 'none').style('opacity', '0').style('z-index', '50').style('color', '#E6F1FF')
    g.selectAll('rect').data(processedData).enter().append('rect').attr('width', cellSize).attr('height', cellSize).attr('rx', 3).attr('ry', 3).attr('x', (_, i) => Math.floor(i / 7) * (cellSize + cellGap)).attr('y', (_, i) => (i % 7) * (cellSize + cellGap)).attr('fill', (d) => colorScale(d.value)).attr('stroke', 'rgba(255,255,255,0.05)').attr('stroke-width', 0.5).on('mouseenter', function (event, d: any) { d3.select(this).attr('stroke', '#00F5A0').attr('stroke-width', 1.5); tooltip.style('opacity', '1').html(`<div class="font-medium">${d.date.toLocaleDateString('en-IN')}</div><div class="text-text-secondary">AQI: ${d.value > 0 ? d.value : 'No data'}</div>`).style('left', `${event.pageX + 10}px`).style('top', `${event.pageY - 30}px`) }).on('mouseleave', function () { d3.select(this).attr('stroke', 'rgba(255,255,255,0.05)').attr('stroke-width', 0.5); tooltip.style('opacity', '0') })
    const dayLabels = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun']
    g.selectAll('.day-label').data(dayLabels).enter().append('text').attr('x', -8).attr('y', (_, i) => i * (cellSize + cellGap) + cellSize / 2 + 4).attr('text-anchor', 'end').attr('fill', '#8892B0').attr('font-size', '9px').text((d) => d)
    const monthLabels: { index: number; label: string }[] = []
    processedData.forEach((d, i) => { if (i === 0 || d.date.getMonth() !== processedData[i - 1].date.getMonth()) { monthLabels.push({ index: Math.floor(i / 7), label: d.date.toLocaleString('default', { month: 'short' }) }) } })
    g.selectAll('.month-label').data(monthLabels).enter().append('text').attr('x', (d: any) => d.index * (cellSize + cellGap)).attr('y', -6).attr('fill', '#8892B0').attr('font-size', '10px').text((d: any) => d.label)
    const legendData = [0, 50, 100, 150, 200, 300]
    const legend = g.append('g').attr('transform', `translate(0, ${h - 15})`)
    legend.selectAll('rect').data(legendData).enter().append('rect').attr('x', (_, i) => i * 20).attr('y', 0).attr('width', 16).attr('height', 10).attr('rx', 2).attr('fill', (d) => d === 0 ? 'rgba(15,31,61,0.4)' : aqiColor(d))
    return () => { try { tooltip.remove() } catch {} }
  }, [processedData])

  return (
    <motion.div
      className={cn('glass rounded-xl p-4', className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <svg ref={svgRef} className="w-full" style={{ height: '140px' }} />
    </motion.div>
  )
}
