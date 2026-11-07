-- Photo store tables (additive only).
-- Idempotent: the store also creates these at runtime if they are missing (src/shop/server/schema.ts),
-- so this migration must succeed whether or not they already exist.

-- CreateTable
CREATE TABLE IF NOT EXISTS "ShopGeneration" (
    "id" TEXT NOT NULL,
    "styleId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "variants" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "clientHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ShopOrder" (
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
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ShopGeneration_clientHash_createdAt_idx" ON "ShopGeneration"("clientHash", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ShopGeneration_createdAt_idx" ON "ShopGeneration"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ShopOrder_ref_key" ON "ShopOrder"("ref");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ShopOrder_createdAt_idx" ON "ShopOrder"("createdAt");
