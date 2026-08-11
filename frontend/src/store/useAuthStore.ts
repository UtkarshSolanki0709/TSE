import { create } from 'zustand';

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
  token: null,
  user: null,
  mode: (import.meta.env.VITE_MODE as 'local' | 'cloud') || 'local',

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
