/** Shapes shared by the store's API and its pages. */

export type VariantStatus = 'pending' | 'done' | 'error';

export interface PublicVariant {
  status: VariantStatus;
  url?: string;
}

export interface PublicGeneration {
  id: string;
  styleId: string;
  status: 'pending' | 'done' | 'error';
  variants: PublicVariant[];
  createdAt: string;
}

export interface OrderItemInput {
  generationId: string;
  variant: number;
  frame: 'black' | 'white';
  qty: number;
}

export interface CheckoutDetails {
  name: string;
  phone: string;
  city: string;
  address: string;
  notes: string;
}
