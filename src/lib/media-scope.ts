import type { Prisma } from '@prisma/client';
import { BUSINESS_ROLES, type SessionUser } from './auth';

/**
 * Which media assets a user may see: business users share the business
 * library; studio-only users see just their own work.
 */
export function mediaScope(user: SessionUser): Prisma.MediaAssetWhereInput {
  return BUSINESS_ROLES.includes(user.role)
    ? { user: { role: { in: BUSINESS_ROLES } } }
    : { userId: user.id };
}
