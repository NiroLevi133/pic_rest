import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function fetchPageHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RestaurantBot/1.0)' },
    });
    const text = await res.text();
    // Trim to 15k chars so we don't blow the context window
    return text.slice(0, 15000);
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ success: false, error: 'ANTHROPIC_API_KEY לא מוגדר בסביבת השרת' }, { status: 500 });
  }

  try {
    const { url } = await req.json() as { url: string };
    if (!url?.startsWith('http')) {
      return NextResponse.json({ success: false, error: 'URL לא תקין' }, { status: 400 });
    }

    const html = await fetchPageHtml(url).catch(() => '');

    const prompt = `אתה מנתח אתר של מסעדה ומחלץ ממנו מידע לצורך עיצוב עמוד תפריט דיגיטלי.

HTML של האתר (חלקי):
<html_content>
${html || 'לא הצלחנו לטעון את האתר'}
</html_content>

URL: ${url}

הוצא את המידע הבא ב-JSON בלבד (ללא markdown, ללא הסברים):
{
  "primaryColor": "צבע הברנד הראשי בפורמט hex (לדוגמה #e85d04). חפש ב-meta theme-color, CSS variables, כפתורים, קישורים. אם לא ברור — החזר #e85d04",
  "shortDescription": "1-2 משפטים קצרים בעברית על המסעדה — מה היא מגישה, אווירה כללית",
  "atmosphereStyle": "3-5 משפטים בעברית על האווירה, הסגנון הקולינרי, ואיך זה אמור להשתקף בצילום אוכל מקצועי"
}`;

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = (message.content[0] as { type: string; text: string }).text.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('תגובת AI לא תקינה');
    const parsed = JSON.parse(jsonMatch[0]) as {
      primaryColor: string;
      shortDescription: string;
      atmosphereStyle: string;
    };

    const theme = JSON.stringify({ primaryColor: parsed.primaryColor || '#e85d04' });

    await prisma.user.update({
      where: { id: userId },
      data: {
        restaurantUrl: url,
        restaurantDescription: parsed.shortDescription,
        restaurantStyle: parsed.atmosphereStyle,
        restaurantTheme: theme,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        primaryColor: parsed.primaryColor,
        shortDescription: parsed.shortDescription,
        atmosphereStyle: parsed.atmosphereStyle,
      },
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
