import { useEffect, useMemo, useState } from 'react'
import { Line, LineChart, ResponsiveContainer } from 'recharts'
import { OlympusStat, useOlympusStore } from '@/hooks/useOlympusStore'

interface TrendPoint {
  index: number
  value: number
}

function useCountUp(target: number) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    let frame: number
    const duration = 900
    const start = performance.now()

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(target * eased)
      if (progress < 1) {
        frame = requestAnimationFrame(tick)
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target])

  return value
}

function formatValue(value: number, unit?: string) {
  const isInteger = Number.isInteger(value)
  const formatted = isInteger ? value.toFixed(0) : value.toFixed(1)
  return unit ? `${formatted}${unit}` : formatted
}

export function StatsRow() {
  const stats = useOlympusStore((state) => state.stats)

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.id} stat={stat} />
      ))}
    </div>
  )
}

function StatCard({ stat }: { stat: OlympusStat }) {
  const animatedValue = useCountUp(stat.value)
  const trend: TrendPoint[] = useMemo(
    () => stat.trend.map((value, index) => ({ value, index })),
    [stat.trend],
  )
  const isPositive = stat.delta >= 0

  return (
    <div className="glass-panel glow-border p-4 animate-card-reveal">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.24em] text-text-muted">
            {stat.label}
          </p>
          <div className="mt-3 text-2xl font-semibold text-primary font-mono">
            {formatValue(animatedValue, stat.unit)}
          </div>
        </div>
        <div className={`text-xs font-mono uppercase tracking-[0.24em] ${isPositive ? 'text-success' : 'text-error'}`}>
          {isPositive ? '▲' : '▼'} {Math.abs(stat.delta).toFixed(1)}%
        </div>
      </div>
      <div className="mt-4 h-12">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trend}>
            <Line
              type="monotone"
              dataKey="value"
              stroke="rgba(184, 150, 90, 0.9)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
