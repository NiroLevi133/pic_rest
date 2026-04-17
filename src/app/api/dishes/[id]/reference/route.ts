import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Max 10MB
const MAX_SIZE = 10 * 1024 * 1024;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const formData = await req.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No image provided' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ success: false, error: 'Image too large (max 10MB)' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ success: false, error: 'File must be an image' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const base64 = `data:${file.type};base64,${Buffer.from(buffer).toString('base64')}`;

    const dish = await prisma.dish.update({
      where: { id: params.id },
      data: { referenceImage: base64, status: 'PENDING' },
    });

    return NextResponse.json({
      success: true,
      data: { referenceImage: dish.referenceImage },
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.dish.update({
      where: { id: params.id },
      data: { referenceImage: null },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
