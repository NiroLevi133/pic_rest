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

// Auto-migrate: add any missing columns without needing prisma db push
if (!globalForPrisma.dbMigrated) {
  globalForPrisma.dbMigrated = true;
  Promise.all([
    prisma.$executeRaw`ALTER TABLE "Dish" ADD COLUMN IF NOT EXISTS "hidden" BOOLEAN NOT NULL DEFAULT false`,
    prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "restaurantUrl" TEXT`,
    prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "restaurantDescription" TEXT`,
    prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "restaurantTheme" TEXT`,
  ]).catch(() => {});
}
