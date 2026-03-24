import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 120;
import { getUserIdFromRequest } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const { menuImage } = await req.json();
    if (!menuImage) return NextResponse.json({ success: false, error: 'menuImage required' }, { status: 400 });

    const settings = await getSettings();
    if (!settings.openaiApiKey) {
      return NextResponse.json({ success: false, error: 'נדרש OpenAI API key בהגדרות' }, { status: 400 });
    }

    const client = new OpenAI({ apiKey: settings.openaiApiKey });

    const res = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Extract ONLY the dish/food names from this restaurant menu image.
Return a JSON array of strings with just the dish names, nothing else.
Example: ["שניצל", "המבורגר", "פסטה קרבונרה"]
If there is Hebrew text keep it in Hebrew. Return only the JSON array, no explanation.`,
          },
          { type: 'image_url', image_url: { url: menuImage, detail: 'high' } },
        ],
      }],
      max_tokens: 1000,
    });

    const content = res.choices[0]?.message?.content?.trim() ?? '[]';
    let dishes: string[] = [];
    try {
      const match = content.match(/\[[\s\S]*\]/);
      dishes = match ? JSON.parse(match[0]) : [];
    } catch {
      dishes = [];
    }

    return NextResponse.json({ success: true, data: { dishes } });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
