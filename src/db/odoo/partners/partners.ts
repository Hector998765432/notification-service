import { getOdooClient, type OdooJsonRpcClient } from '@/db/odoo/odoo.js';
import type { OdooPartner } from '@/types/odoo/partners/partner.js';

export class OdooPartnerRepository {
  constructor(private readonly client: OdooJsonRpcClient = getOdooClient()) {}

  async getPartners(): Promise<OdooPartner[]> {
    return this.client.call<OdooPartner[]>(
      'res.partner',
      'search_read',
      [[['customer_rank', '>', 0]]],
      {
        fields: [
          'name',
          'email',
          'phone',
          'mobile',
          'street',
          'street2',
          'city',
          'state_id',
          'zip',
          'country_id',
          'vat',
          'website',
          'industry_id',
          'user_id',
          'company_id',
          'customer_rank',
          'supplier_rank',
          'is_company',
          'parent_id',
        ],
        limit: 10000,
      }
    );
  }
}

export const odooPartnerRepository = new OdooPartnerRepository();

export async function getPartners(): Promise<OdooPartner[]> {
  return odooPartnerRepository.getPartners();
}
