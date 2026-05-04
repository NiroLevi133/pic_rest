import { PrismaClient } from '@prisma/client';

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

// Auto-migrate: add any missing columns so the app works without running prisma db push manually
if (!globalForPrisma.dbMigrated) {
  globalForPrisma.dbMigrated = true;
  prisma.$executeRaw`
    ALTER TABLE "Dish" ADD COLUMN IF NOT EXISTS "hidden" BOOLEAN NOT NULL DEFAULT false
  `.catch(() => {
    // Silently ignore — column already exists or DB not yet reachable at import time
  });
}
