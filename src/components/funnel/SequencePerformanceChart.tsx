import React from 'react'

export type PerformancePoint = {
  label: string
  value: number
}

interface SequencePerformanceChartProps {
  title: string
  data: PerformancePoint[]
  accent?: 'green' | 'blue' | 'purple'
}

const accentColors: Record<NonNullable<SequencePerformanceChartProps['accent']>, { stroke: string; fill: string }> = {
  green: { stroke: 'stroke-emerald-500', fill: 'fill-emerald-200/40' },
  blue: { stroke: 'stroke-blue-500', fill: 'fill-blue-200/40' },
  purple: { stroke: 'stroke-purple-500', fill: 'fill-purple-200/40' }
}

export const SequencePerformanceChart: React.FC<SequencePerformanceChartProps> = ({ title, data, accent = 'blue' }) => {
  if (data.length === 0) {
    return (
      <div className="border border-slate-200 rounded-lg p-4 bg-white">
        <p className="text-sm text-slate-500">No data available.</p>
      </div>
    )
  }

  const maxValue = Math.max(...data.map((point) => point.value)) || 1
  const path = data
    .map((point, index) => {
      const x = (index / (data.length - 1 || 1)) * 100
      const y = 100 - (point.value / maxValue) * 100
      return `${index === 0 ? 'M' : 'L'} ${x},${y}`
    })
    .join(' ')

  const accentClass = accentColors[accent]

  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-slate-700">{title}</h4>
        <span className="text-xs text-slate-500">Interactive</span>
      </div>
      <div className="relative h-40">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
          <path d={`${path}`} className={`fill-none stroke-2 ${accentClass.stroke}`} />
          {data.map((point, index) => {
            const x = (index / (data.length - 1 || 1)) * 100
            const y = 100 - (point.value / maxValue) * 100
            return <circle key={point.label} cx={x} cy={y} r={1.8} className={`${accentClass.stroke} ${accentClass.fill}`} />
          })}
        </svg>
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-white/80 to-transparent rounded-lg" />
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        {data.map((point) => (
          <span key={point.label} className="truncate w-full text-center">
            {point.label}
          </span>
        ))}
      </div>
    </div>
  )
}

