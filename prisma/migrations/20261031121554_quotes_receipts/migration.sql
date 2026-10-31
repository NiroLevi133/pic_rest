-- AlterTable
ALTER TABLE "BusinessProfile" ADD COLUMN     "setupCompletedAt" TIMESTAMP(3),
ADD COLUMN     "vatRate" INTEGER NOT NULL DEFAULT 18;

-- CreateTable
CREATE TABLE "DocumentCounter" (
    "key" TEXT NOT NULL,
    "next" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentCounter_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "parentQuoteId" TEXT,
    "customerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "template" TEXT NOT NULL DEFAULT 'GENERAL',
    "title" TEXT NOT NULL DEFAULT '',
    "serviceType" TEXT NOT NULL DEFAULT '',
    "clientRole" TEXT NOT NULL DEFAULT '',
    "eventDate" TIMESTAMP(3),
    "location" TEXT NOT NULL DEFAULT '',
    "guestCount" INTEGER,
    "priceMode" TEXT NOT NULL DEFAULT 'TOTAL',
    "packagePrice" INTEGER NOT NULL DEFAULT 0,
    "tiers" JSONB NOT NULL DEFAULT '[]',
    "discountType" TEXT NOT NULL DEFAULT 'AMOUNT',
    "discountValue" INTEGER NOT NULL DEFAULT 0,
    "pricesIncludeVat" BOOLEAN NOT NULL DEFAULT false,
    "extraHourPrice" INTEGER,
    "depositAmount" INTEGER,
    "paymentTerms" TEXT NOT NULL DEFAULT '',
    "validUntil" TIMESTAMP(3),
    "clientNotes" TEXT NOT NULL DEFAULT '',
    "internalNotes" TEXT NOT NULL DEFAULT '',
    "niroFeatures" JSONB NOT NULL DEFAULT '[]',
    "gift" TEXT NOT NULL DEFAULT '',
    "subtotal" INTEGER NOT NULL DEFAULT 0,
    "discountAmount" INTEGER NOT NULL DEFAULT 0,
    "vatRate" INTEGER NOT NULL DEFAULT 0,
    "vatAmount" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "shareToken" TEXT NOT NULL,
    "designAssetId" TEXT,
    "sentAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteItem" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitPrice" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuoteItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "quoteId" TEXT,
    "method" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "reference" TEXT NOT NULL DEFAULT '',
    "chequeNumber" TEXT NOT NULL DEFAULT '',
    "chequeBank" TEXT NOT NULL DEFAULT '',
    "chequeBranch" TEXT NOT NULL DEFAULT '',
    "chequeAccount" TEXT NOT NULL DEFAULT '',
    "chequeDueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'RECEIPT',
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerId" TEXT NOT NULL,
    "quoteId" TEXT,
    "total" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "contentHash" TEXT NOT NULL,
    "cancelsReceiptId" TEXT,
    "cancelReason" TEXT NOT NULL DEFAULT '',
    "shareToken" TEXT NOT NULL,
    "printCount" INTEGER NOT NULL DEFAULT 0,
    "originalChannel" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Quote_shareToken_key" ON "Quote"("shareToken");

-- CreateIndex
CREATE INDEX "Quote_customerId_idx" ON "Quote"("customerId");

-- CreateIndex
CREATE INDEX "Quote_status_idx" ON "Quote"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_number_version_key" ON "Quote"("number", "version");

-- CreateIndex
CREATE INDEX "QuoteItem_quoteId_idx" ON "QuoteItem"("quoteId");

-- CreateIndex
CREATE INDEX "Payment_customerId_idx" ON "Payment"("customerId");

-- CreateIndex
CREATE INDEX "Payment_quoteId_idx" ON "Payment"("quoteId");

-- CreateIndex
CREATE INDEX "Payment_receiptId_idx" ON "Payment"("receiptId");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_number_key" ON "Receipt"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_cancelsReceiptId_key" ON "Receipt"("cancelsReceiptId");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_shareToken_key" ON "Receipt"("shareToken");

-- CreateIndex
CREATE INDEX "Receipt_customerId_idx" ON "Receipt"("customerId");

-- CreateIndex
CREATE INDEX "Receipt_issuedAt_idx" ON "Receipt"("issuedAt");

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_cancelsReceiptId_fkey" FOREIGN KEY ("cancelsReceiptId") REFERENCES "Receipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── Immutability of legal documents ──────────────────────────────────────
-- Receipts: never deleted; only status (ISSUED → CANCELLED), printCount and
-- originalChannel (set once) may change.
CREATE OR REPLACE FUNCTION receipt_guard() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Receipts cannot be deleted (receipt %)', OLD."number";
  END IF;
  IF NEW."id" IS DISTINCT FROM OLD."id"
     OR NEW."number" IS DISTINCT FROM OLD."number"
     OR NEW."type" IS DISTINCT FROM OLD."type"
     OR NEW."issuedAt" IS DISTINCT FROM OLD."issuedAt"
     OR NEW."customerId" IS DISTINCT FROM OLD."customerId"
     OR NEW."quoteId" IS DISTINCT FROM OLD."quoteId"
     OR NEW."total" IS DISTINCT FROM OLD."total"
     OR NEW."description" IS DISTINCT FROM OLD."description"
     OR NEW."snapshot" IS DISTINCT FROM OLD."snapshot"
     OR NEW."contentHash" IS DISTINCT FROM OLD."contentHash"
     OR NEW."cancelsReceiptId" IS DISTINCT FROM OLD."cancelsReceiptId"
     OR NEW."cancelReason" IS DISTINCT FROM OLD."cancelReason"
     OR NEW."shareToken" IS DISTINCT FROM OLD."shareToken"
     OR NEW."createdById" IS DISTINCT FROM OLD."createdById"
     OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt" THEN
    RAISE EXCEPTION 'Receipts are immutable (receipt %)', OLD."number";
  END IF;
  IF NEW."status" IS DISTINCT FROM OLD."status"
     AND NOT (OLD."status" = 'ISSUED' AND NEW."status" = 'CANCELLED' AND OLD."type" = 'RECEIPT') THEN
    RAISE EXCEPTION 'Invalid receipt status change % → %', OLD."status", NEW."status";
  END IF;
  IF OLD."originalChannel" IS NOT NULL AND NEW."originalChannel" IS DISTINCT FROM OLD."originalChannel" THEN
    RAISE EXCEPTION 'Receipt original was already produced';
  END IF;
  IF NEW."printCount" < OLD."printCount" THEN
    RAISE EXCEPTION 'printCount cannot decrease';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER receipt_immutable
  BEFORE UPDATE OR DELETE ON "Receipt"
  FOR EACH ROW EXECUTE FUNCTION receipt_guard();

-- Payments belong to a receipt and are fully immutable.
CREATE OR REPLACE FUNCTION payment_guard() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Payments are immutable — cancel the receipt instead';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_immutable
  BEFORE UPDATE OR DELETE ON "Payment"
  FOR EACH ROW EXECUTE FUNCTION payment_guard();
