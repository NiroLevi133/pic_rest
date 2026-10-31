'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Martini } from 'lucide-react';
import BusinessGate from '@/components/BusinessGate';
import Spinner from '@/components/ui/Spinner';
import BusinessProfileForm from '@/components/business/BusinessProfileForm';

/** First-run setup: the owner fills the business details before using the system. */
function Setup() {
  const params = useSearchParams();
  return (
    <div className="max-w-2xl mx-auto mb-10">
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-[var(--accent)] flex items-center justify-center mx-auto mb-3">
          <Martini className="w-6 h-6 text-[var(--accent-fg)]" />
        </div>
        <h1 className="text-2xl font-bold">ברוך הבא ל-NIRO Workspace</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">הגדרה חד-פעמית: הפרטים האלה יופיעו בהצעות המחיר ובקבלות. אפשר לשנות אותם בכל זמן בהגדרות.</p>
      </div>
      <BusinessProfileForm
        submitLabel="שמירה והתחלה"
        // Full navigation so the shell reloads the user without the setup flag.
        onSaved={() => { window.location.href = params.get('return') || '/quotes'; }}
      />
    </div>
  );
}

export default function SetupPage() {
  return <BusinessGate><Suspense fallback={<Spinner />}><Setup /></Suspense></BusinessGate>;
}
