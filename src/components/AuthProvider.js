'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '@/lib/supabase';
import { gateReadSession } from '@/lib/gateUsers';
import { syncToCloud } from '@/lib/cloudSync';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wenn Gate-Session aktiv → synthetischen User setzen
    const gateUser = gateReadSession();
    if (gateUser) {
      setUser({ id: `gate:${gateUser}`, username: gateUser, isGateUser: true });
      setLoading(false);
      return;
    }

    auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Push local data to cloud every 30 s while logged in
  useEffect(() => {
    if (!user?.id || user?.isGateUser) return;
    const id = setInterval(() => syncToCloud(user.id), 30_000);
    // Also push immediately when user becomes active
    syncToCloud(user.id);
    return () => clearInterval(id);
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
