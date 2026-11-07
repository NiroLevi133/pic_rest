import { db } from './db';
import { deleteStored } from './storage';

/** Uploads and results that were never ordered are deleted after this many days (see the privacy page). */
export const RETENTION_DAYS = Number(process.env.SHOP_RETENTION_DAYS || 30);
/** Small batches, so cleanup never slows an upload down noticeably. */
const BATCH = 20;

interface StoredVariant { url?: string }

/**
 * Delete expired generations that no order refers to: their files in storage, then the row.
 * Runs opportunistically on every new upload, so no scheduled job is needed.
 * Returns how many generations were removed.
 */
export async function purgeExpiredGenerations(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const expired = await db.$queryRaw<{ id: string; sourceUrl: string; variants: unknown }[]>`
    SELECT g."id", g."sourceUrl", g."variants" FROM "ShopGeneration" g
    WHERE g."createdAt" < ${cutoff}
      AND NOT EXISTS (
        SELECT 1 FROM "ShopOrder" o
        WHERE o."items"::jsonb @> jsonb_build_array(jsonb_build_object('generationId', g."id"))
      )
    ORDER BY g."createdAt" ASC
    LIMIT ${BATCH}`;
  if (expired.length === 0) return 0;

  const files = expired.flatMap((g) => [g.sourceUrl, ...((g.variants as StoredVariant[]) ?? []).map((v) => v.url ?? '')]);
  await deleteStored(files);
  const { count } = await db.shopGeneration.deleteMany({ where: { id: { in: expired.map((g) => g.id) } } });
  return count;
}
