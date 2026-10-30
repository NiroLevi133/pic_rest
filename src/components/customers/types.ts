export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  taxId: string;
  address: string;
  notes: string;
  status: 'LEAD' | 'QUOTE_SENT' | 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export type CustomerListItem = Pick<Customer, 'id' | 'name' | 'phone' | 'email' | 'status' | 'createdAt' | 'updatedAt'> & {
  quoteCount: number;
};

export type CustomerDraft = Pick<Customer, 'name' | 'phone' | 'email' | 'taxId' | 'address' | 'notes' | 'status'>;

export const EMPTY_CUSTOMER: CustomerDraft = { name: '', phone: '', email: '', taxId: '', address: '', notes: '', status: 'LEAD' };
