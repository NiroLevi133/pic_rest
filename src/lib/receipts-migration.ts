// Receipts & customers module (PostgreSQL / Supabase).
// Runs automatically on server start (see prisma.ts). Safe to run more than once;
// can also be pasted as-is into the Supabase SQL editor.
export const RECEIPTS_MIGRATION_SQL = `

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "businessName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "businessTaxId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "businessAddress" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "businessPhone" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "businessType" TEXT NOT NULL DEFAULT 'exempt';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "receiptCounter" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "Customer" (
  "id"        TEXT NOT NULL PRIMARY KEY,
  "userId"    TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "fullName"  TEXT NOT NULL,
  "phone"     TEXT NOT NULL,
  "company"   TEXT,
  "taxId"     TEXT,
  "email"     TEXT,
  "address"   TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "Customer_userId_phone_key" ON "Customer"("userId", "phone");
CREATE INDEX IF NOT EXISTS "Customer_userId_fullName_idx" ON "Customer"("userId", "fullName");

CREATE TABLE IF NOT EXISTS "Receipt" (
  "id"              TEXT NOT NULL PRIMARY KEY,
  "userId"          TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "customerId"      TEXT NOT NULL REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "number"          INTEGER NOT NULL,
  "issueDate"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "amount"          DECIMAL(12,2) NOT NULL CHECK ("amount" > 0),
  "paymentMethod"   TEXT NOT NULL,
  "paymentRef"      TEXT,
  "description"     TEXT,
  "customerName"    TEXT NOT NULL,
  "customerPhone"   TEXT NOT NULL,
  "customerCompany" TEXT,
  "customerTaxId"   TEXT,
  "issuerName"      TEXT,
  "issuerTaxId"     TEXT,
  "issuerAddress"   TEXT,
  "issuerPhone"     TEXT,
  "issuerType"      TEXT NOT NULL DEFAULT 'exempt',
  "status"          TEXT NOT NULL DEFAULT 'ACTIVE',
  "cancelReason"    TEXT,
  "cancelledAt"     TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "Receipt_userId_number_key" ON "Receipt"("userId", "number");
CREATE INDEX IF NOT EXISTS "Receipt_userId_issueDate_idx" ON "Receipt"("userId", "issueDate");
CREATE INDEX IF NOT EXISTS "Receipt_customerId_idx" ON "Receipt"("customerId");
`;
