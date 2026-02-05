import { useOlympusStore } from '@/hooks/useOlympusStore'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

export function ToastContainer() {
  const toasts = useOlympusStore((state) => state.toasts)
  const removeToast = useOlympusStore((state) => state.removeToast)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg animate-slide-in ${
            toast.type === 'success'
              ? 'bg-[rgba(34,197,94,0.1)] border-success/30 text-success'
              : toast.type === 'error'
              ? 'bg-[rgba(239,68,68,0.1)] border-error/30 text-error'
              : 'bg-[rgba(184,150,90,0.1)] border-primary/30 text-primary'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle size={18} />
          ) : toast.type === 'error' ? (
            <XCircle size={18} />
          ) : (
            <Info size={18} />
          )}
          <span className="text-sm font-mono">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
