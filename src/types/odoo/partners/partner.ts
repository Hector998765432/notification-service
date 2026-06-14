import type { OdooOptionalMany2One, OdooOptionalString } from '@/types/odoo/common.js';

export interface OdooPartner {
  id: number;
  name: string;
  email: OdooOptionalString;
  phone: OdooOptionalString;
  mobile: OdooOptionalString;
  street: OdooOptionalString;
  street2: OdooOptionalString;
  city: OdooOptionalString;
  state_id: OdooOptionalMany2One;
  zip: OdooOptionalString;
  country_id: OdooOptionalMany2One;
  vat: OdooOptionalString;
  website: OdooOptionalString;
  industry_id: OdooOptionalMany2One;
  user_id: OdooOptionalMany2One;
  company_id: OdooOptionalMany2One;
  customer_rank: number;
  supplier_rank: number;
  is_company: boolean;
  parent_id: OdooOptionalMany2One;
}
