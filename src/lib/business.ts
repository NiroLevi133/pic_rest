import type { BusinessProfile } from '@prisma/client';
import { prisma } from './prisma';
import type { VatType } from './quote-math';

export const VAT_TYPES: VatType[] = ['EXEMPT', 'LICENSED', 'COMPANY'];
export { VAT_TYPE_LABELS } from './business-labels';

export function docBusiness(p: BusinessProfile) {
  return {
    name: p.businessName, taxId: p.taxId, vatType: p.vatType, address: p.address,
    phone: p.phone, email: p.email, logoUrl: p.logoUrl, footer: p.documentFooter,
  };
}

/** The single business profile — created on first access. */
export async function getBusinessProfile(): Promise<BusinessProfile> {
  // Read first: an upsert costs extra round trips on every call.
  return (await prisma.businessProfile.findUnique({ where: { id: 'main' } }))
    ?? prisma.businessProfile.upsert({ where: { id: 'main' }, update: {}, create: { id: 'main' } });
}
