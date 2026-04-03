import { NextRequest, NextResponse } from 'next/server';
import { getSettings, saveSettings, toSafeSettings } from '@/lib/settings';
import { getUserIdFromRequest } from '@/lib/auth';
import type { AppSettings } from '@/lib/types';

export async function GET(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const settings = await getSettings();
    return NextResponse.json({ success: true, data: toSafeSettings(settings) });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const updates = await req.json() as Partial<AppSettings>;
    const current = await getSettings();

    // Merge: only update keys that were provided and non-empty
    const merged: AppSettings = { ...current };
    for (const [k, v] of Object.entries(updates)) {
      if (v !== undefined && v !== '') {
        (merged as unknown as Record<string, unknown>)[k] = v;
      }
    }

    await saveSettings(merged);
    return NextResponse.json({ success: true, data: toSafeSettings(merged) });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}
