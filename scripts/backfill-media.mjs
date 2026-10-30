/**
 * Copy every generated image/video from the legacy Menu → Dish → DishImage
 * tables into MediaAsset, so the gallery no longer depends on menus.
 *
 * Idempotent: each asset is keyed by legacyImageId ("<DishImage.id>" or
 * "dish:<Dish.id>"), so re-running only adds what is missing.
 * Never modifies or deletes legacy rows.
 *
 *   node scripts/backfill-media.mjs            # dry run — prints counts
 *   node scripts/backfill-media.mjs --apply    # writes MediaAsset rows
 */
import { PrismaClient } from '@prisma/client';

const apply = process.argv.includes('--apply');
const prisma = new PrismaClient();

const isHttp = (v) => typeof v === 'string' && /^https?:\/\//.test(v);

async function main() {
  const existing = new Set(
    (await prisma.mediaAsset.findMany({ where: { legacyImageId: { not: null } }, select: { legacyImageId: true } }))
      .map((a) => a.legacyImageId),
  );

  const dishes = await prisma.dish.findMany({
    where: { OR: [{ imageUrl: { not: null } }, { videoUrl: { not: null } }, { images: { some: {} } }] },
    select: {
      id: true, name: true, prompt: true, imageUrl: true, videoUrl: true, mediaType: true,
      referenceImage: true, updatedAt: true, hidden: true,
      menu: { select: { userId: true, styleKey: true } },
      images: { select: { id: true, imageUrl: true, createdAt: true }, orderBy: { createdAt: 'asc' } },
    },
  });

  const rows = [];
  for (const dish of dishes) {
    const base = {
      userId: dish.menu.userId,
      title: dish.name,
      styleKey: dish.menu.styleKey ? dish.menu.styleKey.replace(/^lab_/, '') : null,
      prompt: dish.prompt || null,
      // Base64 sources stay in Dish.referenceImage and are served via legacyDishId.
      sourceImageUrl: isHttp(dish.referenceImage) ? dish.referenceImage : null,
      legacyDishId: dish.id,
      deletedAt: dish.hidden ? dish.updatedAt : null,
    };

    const seenUrls = new Set();
    for (const img of dish.images) {
      seenUrls.add(img.imageUrl);
      rows.push({ ...base, kind: 'image', url: img.imageUrl, legacyImageId: img.id, createdAt: img.createdAt });
    }
    // Dish.imageUrl usually duplicates its latest DishImage — only add it when it doesn't.
    if (dish.imageUrl && !seenUrls.has(dish.imageUrl)) {
      rows.push({ ...base, kind: 'image', url: dish.imageUrl, legacyImageId: `dish:${dish.id}`, createdAt: dish.updatedAt });
    }
    if (dish.mediaType === 'video' && dish.videoUrl) {
      rows.push({ ...base, kind: 'video', url: dish.videoUrl, legacyImageId: `video:${dish.id}`, createdAt: dish.updatedAt });
    }
  }

  const missing = rows.filter((r) => !existing.has(r.legacyImageId));
  console.log(`dishes with media: ${dishes.length}`);
  console.log(`legacy media items: ${rows.length} (already backfilled: ${rows.length - missing.length}, to add: ${missing.length})`);

  if (!apply) {
    console.log('Dry run — re-run with --apply to write.');
    return;
  }
  for (let i = 0; i < missing.length; i += 100) {
    await prisma.mediaAsset.createMany({ data: missing.slice(i, i + 100), skipDuplicates: true });
  }
  const total = await prisma.mediaAsset.count({ where: { legacyImageId: { not: null } } });
  console.log(`done — MediaAsset rows from legacy data: ${total}`);
}

main().finally(() => prisma.$disconnect());
