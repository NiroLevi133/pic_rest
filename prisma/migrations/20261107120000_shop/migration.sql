-- Photo store tables (additive only)

-- CreateTable
CREATE TABLE "ShopGeneration" (
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
CREATE TABLE "ShopOrder" (
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
CREATE INDEX "ShopGeneration_clientHash_createdAt_idx" ON "ShopGeneration"("clientHash", "createdAt");

-- CreateIndex
CREATE INDEX "ShopGeneration_createdAt_idx" ON "ShopGeneration"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ShopOrder_ref_key" ON "ShopOrder"("ref");

-- CreateIndex
CREATE INDEX "ShopOrder_createdAt_idx" ON "ShopOrder"("createdAt");
