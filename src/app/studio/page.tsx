'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Image as ImageIcon, Images, Wand2 } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import Tabs from '@/components/ui/Tabs';
import Spinner from '@/components/ui/Spinner';
import SingleTab, { type SinglePrefill } from './SingleTab';
import MultiTab from './MultiTab';
import AdvancedTab from './AdvancedTab';

type TabKey = 'single' | 'multi' | 'advanced';

function StudioContent() {
  const router = useRouter();
  const params = useSearchParams();
  const tab = (['single', 'multi', 'advanced'].includes(params.get('tab') ?? '') ? params.get('tab') : 'single') as TabKey;
  const variationOf = params.get('variationOf');

  const [perms, setPerms] = useState<{ canSingleGenerate: boolean; canMultiGenerate: boolean } | null>(null);
  const [prefill, setPrefill] = useState<SinglePrefill | null>(null);

  useEffect(() => {
    fetch('/api/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setPerms(d ?? { canSingleGenerate: false, canMultiGenerate: false }));
  }, []);

  useEffect(() => {
    if (!variationOf) return;
    fetch(`/api/gallery/${variationOf}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) return;
        setPrefill({
          parentAssetId: d.data.id,
          title: d.data.title,
          styleKey: d.data.styleKey,
          sourceUrl: d.data.hasSource ? `/api/media/${d.data.id}?variant=source` : null,
        });
      });
  }, [variationOf]);

  function setTab(key: TabKey) {
    const next = new URLSearchParams(params.toString());
    next.set('tab', key);
    if (key !== 'single') next.delete('variationOf');
    router.replace(`/studio?${next.toString()}`, { scroll: false });
  }

  return (
    <>
      <PageHeader title="סטודיו AI" subtitle="יצירת תמונות מקצועיות — בודדות, מרובות וכלים מתקדמים" />
      <Tabs<TabKey>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'single', label: 'גנרוט בודד', icon: ImageIcon },
          { key: 'multi', label: 'גנרוט מרובה', icon: Images },
          { key: 'advanced', label: 'כלים מתקדמים', icon: Wand2 },
        ]}
      />
      {!perms ? (
        <Spinner />
      ) : (
        // All tabs stay mounted so a running batch survives switching tabs.
        <>
          <div hidden={tab !== 'single'}><SingleTab prefill={prefill} canGenerate={perms.canSingleGenerate} /></div>
          <div hidden={tab !== 'multi'}><MultiTab canGenerate={perms.canMultiGenerate} /></div>
          <div hidden={tab !== 'advanced'}><AdvancedTab canGenerate={perms.canMultiGenerate} /></div>
        </>
      )}
    </>
  );
}

export default function StudioPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <StudioContent />
    </Suspense>
  );
}
