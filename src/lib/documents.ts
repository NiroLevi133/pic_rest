import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';

export type DocumentKey = 'quote' | 'receipt';

/**
 * Allocate the next number of a document series. Must run inside the same
 * transaction that creates the document: the row lock taken by the UPSERT
 * serializes concurrent issuers, and a rollback releases the number — so the
 * series has no gaps and no duplicates.
 */
export async function allocateNumber(tx: Prisma.TransactionClient, key: DocumentKey): Promise<number> {
  const rows = await tx.$queryRaw<{ number: number }[]>`
    INSERT INTO "DocumentCounter" ("key", "next", "updatedAt") VALUES (${key}, 2, NOW())
    ON CONFLICT ("key") DO UPDATE SET "next" = "DocumentCounter"."next" + 1, "updatedAt" = NOW()
    RETURNING "next" - 1 AS "number"`;
  return Number(rows[0].number);
}

export interface CounterState {
  next: number;
  /** True once a document of this type exists — the start number can no longer change. */
  locked: boolean;
  /** Receipts: date (yyyy-mm-dd) of the latest receipt — new receipts can't be dated earlier */
  lastDate?: string | null;
}

export async function getCounterState(key: DocumentKey): Promise<CounterState> {
  return (await getCounterStates())[key];
}

/** Both series in one round trip. */
export async function getCounterStates(): Promise<Record<DocumentKey, CounterState>> {
  const [row] = await prisma.$queryRaw<{ quote_next: number | null; receipt_next: number | null; has_quote: boolean; has_receipt: boolean; last_receipt_date: Date | null }[]>`
    SELECT
      (SELECT "next" FROM "DocumentCounter" WHERE "key" = 'quote')   AS quote_next,
      (SELECT "next" FROM "DocumentCounter" WHERE "key" = 'receipt') AS receipt_next,
      EXISTS (SELECT 1 FROM "Quote")   AS has_quote,
      EXISTS (SELECT 1 FROM "Receipt") AS has_receipt,
      (SELECT MAX("documentDate") FROM "Receipt") AS last_receipt_date`;
  return {
    quote: { next: row.quote_next ?? 1, locked: row.has_quote },
    receipt: { next: row.receipt_next ?? 1, locked: row.has_receipt, lastDate: row.last_receipt_date?.toISOString().slice(0, 10) ?? null },
  };
}

/** Set the first number of a series. Only allowed before the first document was issued. */
export async function setCounterStart(key: DocumentKey, start: number): Promise<void> {
  if (!Number.isInteger(start) || start < 1 || start > 99_999_999) throw new Error('מספר התחלתי לא תקין');
  await prisma.$transaction(async (tx) => {
    const count = key === 'receipt' ? await tx.receipt.count() : await tx.quote.count();
    if (count > 0) throw new Error('לא ניתן לשנות את המספור לאחר שהופק מסמך ראשון');
    await tx.documentCounter.upsert({ where: { key }, update: { next: start }, create: { key, next: start } });
  });
}
