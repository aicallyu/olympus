import { useUser } from '@/contexts/UserContext';

export function UserPicker() {
  const { user, setUser, availableUsers } = useUser();

  if (user) {
    return (
      <div className="flex items-center gap-2 text-xs font-mono text-text-secondary">
        <span>User:</span>
        <span className="text-primary">{user.name}</span>
        <button
          onClick={() => setUser(availableUsers[0])} // Reset to switch
          className="text-text-muted hover:text-text-primary underline"
        >
          change
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="glass-panel glow-border rounded-lg p-8 max-w-sm w-full text-center">
        <h2 className="font-mono text-lg uppercase tracking-[0.15em] text-primary mb-2">
          Select User
        </h2>
        <p className="text-xs text-text-muted font-mono mb-6">
          Who are you?
        </p>
        
        <div className="grid grid-cols-2 gap-3">
          {availableUsers.map((u) => (
            <button
              key={u.name}
              onClick={() => setUser(u)}
              className="p-4 rounded-lg border border-border bg-[rgba(22,22,32,0.6)] hover:bg-[rgba(184,150,90,0.1)] hover:border-primary/40 transition-all text-center"
            >
              <div className="text-2xl mb-2">👤</div>
              <div className="font-mono text-sm text-text-primary">{u.name}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
