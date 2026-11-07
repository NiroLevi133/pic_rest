import { db } from './db';

/**
 * The store's tables, created on first use if the deploy didn't run the migration
 * (prisma/migrations/20261107120000_shop — same SQL; a test keeps the two identical).
 * Every statement is idempotent, so running it on a ready database changes nothing.
 */
export const SHOP_SCHEMA_SQL: string[] = [
  `CREATE TABLE IF NOT EXISTS "ShopGeneration" (
    "id" TEXT NOT NULL,
    "styleId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "variants" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "clientHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ShopGeneration_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "ShopOrder" (
    "id" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "notes" TEXT,
    "items" JSONB NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "discount" INTEGER NOT NULL,
    "shipping" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ShopOrder_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "ShopGeneration_clientHash_createdAt_idx" ON "ShopGeneration"("clientHash", "createdAt")`,
  `CREATE INDEX IF NOT EXISTS "ShopGeneration_createdAt_idx" ON "ShopGeneration"("createdAt")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "ShopOrder_ref_key" ON "ShopOrder"("ref")`,
  `CREATE INDEX IF NOT EXISTS "ShopOrder_createdAt_idx" ON "ShopOrder"("createdAt")`,
];

let pending: Promise<void> | null = null;

/** Create any missing store tables (once per server instance, concurrent callers share the work). */
export function ensureShopTables(): Promise<void> {
  pending ??= (async () => {
    for (const sql of SHOP_SCHEMA_SQL) await db.$executeRawUnsafe(sql);
    console.warn('[shop] store tables were missing and have been created');
  })().catch((e) => { pending = null; throw e; });
  return pending;
}
