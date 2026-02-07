import { useEffect, useState } from 'react'
import { AgentDetailCard } from '@/components/agents/AgentDetailCard'
import { AgentProfileModal } from '@/components/agents/AgentProfileModal'
import { useOlympusStore } from '@/hooks/useOlympusStore'

export function AgentStatus() {
  const agents = useOlympusStore((state) => state.agents)
  const fetchAgents = useOlympusStore((state) => state.fetchAgents)
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)

  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

  return (
    <div className="space-y-8">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-text-muted">Agents</p>
        <h2 className="text-2xl font-display mt-2 sm:text-3xl">Pantheon Status Console</h2>
        <p className="mt-2 text-sm text-text-secondary">Live performance analytics for every divine unit.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agents
          .filter((agent) => !agent.sessionKey?.startsWith('human:'))
          .map((agent) => (
            <div key={agent.id} onClick={() => setSelectedAgentId(agent.id)} className="cursor-pointer">
              <AgentDetailCard agent={agent} />
            </div>
          ))}
      </div>

      {selectedAgentId && (
        <AgentProfileModal
          agentId={selectedAgentId}
          onClose={() => setSelectedAgentId(null)}
        />
      )}
    </div>
  )
}
