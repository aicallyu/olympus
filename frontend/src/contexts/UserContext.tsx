import { createContext, useContext, useState, ReactNode } from 'react';

type UserRole = 'human' | 'ai';

interface User {
  name: string;
  role: UserRole;
}

interface UserContextType {
  user: User | null;
  setUser: (user: User) => void;
  availableUsers: User[];
}

const AVAILABLE_USERS: User[] = [
  { name: 'Juan', role: 'human' },
  { name: 'Nathanael', role: 'human' },
];

const UserContext = createContext<UserContextType | undefined>(undefined);

const STORAGE_KEY = 'olymp_user';

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  });

  const setUser = (newUser: User) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
    setUserState(newUser);
  };

  return (
    <UserContext.Provider value={{ user, setUser, availableUsers: AVAILABLE_USERS }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
}
