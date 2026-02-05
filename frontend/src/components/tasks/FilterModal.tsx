import { X } from 'lucide-react'

interface FilterModalProps {
  onClose: () => void
}

export function FilterModal({ onClose }: FilterModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm glass-panel glow-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display text-xl text-primary">FILTER</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <h4 className="font-mono text-xs uppercase tracking-[0.2em] text-text-muted mb-3">
              By Agent
            </h4>
            <div className="space-y-2">
              {['ARGOS', 'ATLAS', 'HERCULOS', 'ATHENA', 'PROMETHEUS', 'APOLLO', 'HERMES'].map((agent) => (
                <label key={agent} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-border bg-surface" />
                  <span className="text-sm text-text-primary">{agent}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-mono text-xs uppercase tracking-[0.2em] text-text-muted mb-3">
              By Status
            </h4>
            <div className="space-y-2">
              {['Inbox', 'Assigned', 'In Progress', 'Review', 'Done', 'Blocked'].map((status) => (
                <label key={status} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-border bg-surface" />
                  <span className="text-sm text-text-primary">{status}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-mono text-xs uppercase tracking-[0.2em] text-text-muted mb-3">
              By Priority
            </h4>
            <div className="space-y-2">
              {['Critical', 'High', 'Normal', 'Low'].map((priority) => (
                <label key={priority} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-border bg-surface" />
                  <span className="text-sm text-text-primary">{priority}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 btn-secondary py-3 font-mono uppercase tracking-[0.2em] text-sm"
            >
              Clear
            </button>
            <button
              onClick={onClose}
              className="flex-1 btn-primary py-3 font-mono uppercase tracking-[0.2em] text-sm"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
