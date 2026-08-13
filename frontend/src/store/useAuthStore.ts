import { create } from 'zustand';

function resolveMode(): 'local' | 'cloud' {
  const envMode = import.meta.env.VITE_MODE as 'local' | 'cloud' | undefined;
  if (envMode === 'local' || envMode === 'cloud') return envMode;

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return 'local';
  }

  return 'cloud';
}

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('tse_token');
}

interface AuthState {
  token: string | null;
  user: { id: string; email: string; createdAt: number } | null;
  mode: 'local' | 'cloud';
  setToken: (token: string | null) => void;
  setUser: (user: { id: string; email: string; createdAt: number } | null) => void;
  logout: () => void;
  init: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: getStoredToken(),
  user: null,
  mode: resolveMode(),

  setToken: (token) => {
    if (token) localStorage.setItem('tse_token', token);
    else localStorage.removeItem('tse_token');
    set({ token });
  },

  setUser: (user) => set({ user }),

  logout: () => {
    localStorage.removeItem('tse_token');
    set({ token: null, user: null });
  },

  init: () => {
    const token = localStorage.getItem('tse_token');
    if (token) set({ token });
  },
}));
