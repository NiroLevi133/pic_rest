import { PrismaClient } from '@prisma/client';
import { RECEIPTS_MIGRATION_SQL } from './receipts-migration';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient;
  dbMigrated: boolean;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Auto-migrate: add any missing columns without needing prisma db push
if (!globalForPrisma.dbMigrated) {
  globalForPrisma.dbMigrated = true;
  Promise.all([
    prisma.$executeRaw`ALTER TABLE "Dish" ADD COLUMN IF NOT EXISTS "hidden" BOOLEAN NOT NULL DEFAULT false`,
    prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "restaurantUrl" TEXT`,
    prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "restaurantDescription" TEXT`,
    prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "restaurantTheme" TEXT`,
    prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "canSingleGenerate" BOOLEAN NOT NULL DEFAULT true`,
    prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "canMultiGenerate" BOOLEAN NOT NULL DEFAULT false`,
    prisma.$executeRaw`ALTER TABLE "Dish" ADD COLUMN IF NOT EXISTS "mediaType" TEXT NOT NULL DEFAULT 'image'`,
    prisma.$executeRaw`ALTER TABLE "Dish" ADD COLUMN IF NOT EXISTS "videoUrl" TEXT`,
    prisma.$executeRaw`ALTER TABLE "Dish" ADD COLUMN IF NOT EXISTS "videoOpId" TEXT`,
    prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "niroBarCustomFeatures" TEXT`,
  ]).catch(() => {});

  // Receipts module: run statements in order (tables depend on each other)
  (async () => {
    const statements = RECEIPTS_MIGRATION_SQL
      .split('\n').filter((l) => !l.trim().startsWith('--')).join('\n')
      .split(';').map((s) => s.trim()).filter(Boolean);
    for (const stmt of statements) await prisma.$executeRawUnsafe(stmt);
  })().catch((err) => console.error('[receipts migration]', err));
}
