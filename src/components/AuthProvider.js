'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '@/lib/supabase';
import { gateReadSession } from '@/lib/gateUsers';
import { syncToCloud, syncFromCloud } from '@/lib/cloudSync';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const gateUser = gateReadSession();
    if (gateUser) {
      setUser({ id: `gate:${gateUser}`, username: gateUser, isGateUser: true });
      setLoading(false);
      return;
    }

    // On session restore: pull from cloud so data is always up to date
    auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user?.id) {
        await syncFromCloud(session.user.id);
      }
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.id || user?.isGateUser) return;

    // Push every 30 s and immediately on login
    syncToCloud(user.id);
    const pushInterval = setInterval(() => syncToCloud(user.id), 30_000);

    // Pull when user switches back to this tab (e.g. from another device check)
    function onVisible() {
      if (document.visibilityState === 'visible') {
        syncFromCloud(user.id).then(pulled => {
          // Force pages to re-read localStorage by dispatching a storage event
          if (pulled) window.dispatchEvent(new Event('kynogg-sync'));
        });
      }
    }
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(pushInterval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user?.id]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
