import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';

export interface AuditEntry {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  customerId?: string | null;
  /** Human-readable Hebrew line for timelines */
  summary: string;
  data?: Prisma.InputJsonValue;
}

/** Append to the audit log. Pass `tx` to write inside an existing transaction. */
export async function logAudit(entry: AuditEntry, tx: Prisma.TransactionClient = prisma): Promise<void> {
  await tx.auditLog.create({
    data: {
      userId: entry.userId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      customerId: entry.customerId ?? null,
      summary: entry.summary,
      data: entry.data,
    },
  });
}
