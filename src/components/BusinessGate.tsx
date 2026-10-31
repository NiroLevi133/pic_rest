'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { useCurrentUser, hasBusinessAccess } from './CurrentUser';
import EmptyState from './ui/EmptyState';

/**
 * Renders business screens only for OWNER/MEMBER users. The API enforces access,
 * so while the user is still loading we render the screen right away — its data
 * request then runs in parallel instead of waiting for /api/auth/me.
 */
export default function BusinessGate({ children }: { children: ReactNode }) {
  const { user, loading } = useCurrentUser();
  if (loading) return <>{children}</>;
  if (!hasBusinessAccess(user)) {
    return (
      <EmptyState
        icon={Lock}
        title="אין לך גישה למסך הזה"
        description="המסך זמין למשתמשי העסק בלבד."
        action={<Link href="/studio" className="btn-primary">לסטודיו AI</Link>}
      />
    );
  }
  return <>{children}</>;
}
