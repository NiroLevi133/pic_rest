const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

exports.handler = async (event) => {
  const secret = process.env.BG_SECRET || 'restorante-internal';
  const incoming = event.headers?.['x-bg-secret'] ?? event.headers?.['X-Bg-Secret'] ?? '';
  if (incoming !== secret) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) };
  }

  let dishId;
  if (event.body) {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    dishId = body.dishId;
  } else {
    dishId = event.dishId;
  }

  if (!dishId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'dishId required' }) };
  }

  try {
    const dish = await prisma.dish.findUnique({ where: { id: dishId } });

    if (!dish?.referenceImage) {
      await prisma.dish.update({
        where: { id: dishId },
        data: { status: 'ERROR', errorMessage: 'Missing reference image' },
      });
      return { statusCode: 200, body: JSON.stringify({ ok: false }) };
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    const model = process.env.GEMINI_MODEL || 'gemini-3.1-flash-image-preview';

    const match = dish.referenceImage.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) throw new Error('Invalid reference image format');

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { inlineData: { mimeType: match[1], data: match[2] } },
              { text: dish.prompt },
            ],
          }],
          generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
        }),
      }
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      throw new Error(`Gemini ${geminiRes.status}: ${err}`);
    }

    const data = await geminiRes.json();
    let imageUrl = null;
    for (const part of data.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) {
        imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!imageUrl) throw new Error('Gemini did not return an image');

    await Promise.all([
      prisma.dish.update({
        where: { id: dishId },
        data: { status: 'DONE', imageUrl, errorMessage: null },
      }),
      prisma.dishImage.create({ data: { dishId, imageUrl } }),
    ]);

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('[generate-image-bg]', dishId, errorMessage);
    await prisma.dish.update({
      where: { id: dishId },
      data: { status: 'ERROR', errorMessage, retryCount: { increment: 1 } },
    }).catch(() => {});
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: errorMessage }) };
  } finally {
    await prisma.$disconnect();
  }
};
