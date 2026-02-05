import { Area, AreaChart, ResponsiveContainer } from 'recharts'

interface PerformanceChartProps {
  trend: number[]
}

export function PerformanceChart({ trend }: PerformanceChartProps) {
  const data = trend.map((value, index) => ({ index, value }))

  return (
    <div className="h-16 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="goldFade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(184,150,90,0.6)" />
              <stop offset="100%" stopColor="rgba(184,150,90,0.05)" />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="value" stroke="rgba(184,150,90,0.9)" fill="url(#goldFade)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
