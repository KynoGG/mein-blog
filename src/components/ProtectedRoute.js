'use client';

import { useAuth } from './AuthProvider';
import { useGate } from './GateProvider';

// Da GateProvider die gesamte App schützt, ist AuthGate nie sichtbar.
// Trotzdem als named export für bestehende Imports.
export function AuthGate() {
  return null;
}

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const gate = useGate();

  if (loading) return null;
  // Gate-Login gilt als vollständige Anmeldung
  if (gate?.authed || user) return children;
  return null;
}
