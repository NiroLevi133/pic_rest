'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export interface CurrentUser {
  userId: string;
  phone: string;
  role: 'OWNER' | 'MEMBER' | 'STUDIO_ONLY';
}

const Ctx = createContext<{ user: CurrentUser | null; loading: boolean }>({ user: null, loading: true });

export function CurrentUserProvider({ children, enabled }: { children: ReactNode; enabled: boolean }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) { setLoading(false); return; }
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => { if (d.success) setUser(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [enabled]);

  return <Ctx.Provider value={{ user, loading }}>{children}</Ctx.Provider>;
}

export function useCurrentUser() {
  return useContext(Ctx);
}

export function hasBusinessAccess(user: CurrentUser | null): boolean {
  return user?.role === 'OWNER' || user?.role === 'MEMBER';
}
