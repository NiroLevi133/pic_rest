/**
 * The store's only dependency on the workspace: the shared Prisma client.
 * When the store is split into its own app, replace this with its own client.
 */
export { prisma as db } from '@/lib/prisma';
