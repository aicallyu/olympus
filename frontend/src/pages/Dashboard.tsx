import { useEffect } from 'react'
import { StatsRow } from '@/components/overview/StatsRow'
import { PantheonGrid } from '@/components/overview/PantheonGrid'
import { ActivityFeed } from '@/components/overview/ActivityFeed'
import { useOlympusStore } from '@/hooks/useOlympusStore'

export function Dashboard() {
  const fetchStats = useOlympusStore((state) => state.fetchStats)

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return (
    <div className="space-y-8">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-text-muted">Overview</p>
        <h2 className="text-2xl font-display mt-2 sm:text-3xl">OLYMP Command Nexus</h2>
        <p className="mt-2 text-sm text-text-secondary">
          Premium operational telemetry for the Pantheon.
        </p>
      </div>

      <StatsRow />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-12">
        <section className="space-y-4 md:col-span-1 lg:col-span-8">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-mono uppercase tracking-[0.24em] text-text-secondary">
              The Pantheon
            </h3>
            <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-text-muted">
              Agents Online
            </span>
          </div>
          <PantheonGrid />
        </section>

        <section className="md:col-span-1 lg:col-span-4">
          <ActivityFeed />
        </section>
      </div>
    </div>
  )
}
