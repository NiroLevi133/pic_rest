'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { useCurrentUser, hasBusinessAccess } from './CurrentUser';
import Spinner from './ui/Spinner';
import EmptyState from './ui/EmptyState';

/** Renders business screens only for OWNER/MEMBER users (the API enforces this too). */
export default function BusinessGate({ children }: { children: ReactNode }) {
  const { user, loading } = useCurrentUser();
  if (loading) return <Spinner />;
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
