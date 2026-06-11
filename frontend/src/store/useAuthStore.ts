import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: any | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: any | null) => void;
  setLoading: (isLoading: boolean) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      isLoading: true,
      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setLoading: (isLoading) => set({ isLoading }),
      signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, session: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, session: state.session }),
    }
  )
);

// Initialize session
console.log('Initiating getSession...');
supabase.auth.getSession().then(({ data: { session }, error }) => {
  console.log('getSession resolved. Session:', session ? 'exists' : 'null', 'Error:', error);
  useAuthStore.getState().setSession(session);
  useAuthStore.getState().setUser(session?.user || null);
  useAuthStore.getState().setLoading(false);
}).catch((err) => {
  console.error('Failed to get session:', err);
  useAuthStore.getState().setLoading(false);
});

// Subscribe to auth changes globally
console.log('Subscribing to onAuthStateChange...');
supabase.auth.onAuthStateChange((event, session) => {
  console.log('onAuthStateChange fired! Event:', event, 'Session:', session ? 'exists' : 'null');
  useAuthStore.getState().setSession(session);
  useAuthStore.getState().setUser(session?.user || null);
  useAuthStore.getState().setLoading(false);
});
