-- The date printed on a receipt = the date the payment was received.
-- Existing receipts keep their issue date (in Israel time).
ALTER TABLE "Receipt" ADD COLUMN "documentDate" DATE;
UPDATE "Receipt" SET "documentDate" = ("issuedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem')::date;
ALTER TABLE "Receipt" ALTER COLUMN "documentDate" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Receipt_documentDate_idx" ON "Receipt"("documentDate");

-- documentDate is immutable like the rest of the receipt.
CREATE OR REPLACE FUNCTION receipt_guard() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Receipts cannot be deleted (receipt %)', OLD."number";
  END IF;
  IF NEW."id" IS DISTINCT FROM OLD."id"
     OR NEW."number" IS DISTINCT FROM OLD."number"
     OR NEW."type" IS DISTINCT FROM OLD."type"
     OR NEW."issuedAt" IS DISTINCT FROM OLD."issuedAt"
     OR NEW."documentDate" IS DISTINCT FROM OLD."documentDate"
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
