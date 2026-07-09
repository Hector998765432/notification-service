import type { SupabaseAdminClient } from '@/db/supabase/index.js';
import { getSupabaseAdminClient } from '@/db/supabase/index.js';
import type { CompanyMemberWithUnits, NotificationRecipient } from '@/types/supabase/index.js';
import { RepositoryError } from '@/persistence/repositories/repository-error.js';

type CompanyMemberQueryRow = {
  id: string;
  company_id: string;
  profile_id: string;
  profiles: {
    id: string;
    username: string | null;
    phone: string | null;
  } | null;
  companies: {
    id: string;
    name: string;
    odoo_partner_id: number;
  } | null;
  company_roles: {
    slug: string;
  } | null;
  company_member_units: Array<{
    vin: string;
  }> | {
    vin: string;
  };
};

type CompanyAdminQueryRow = {
  id: string;
  company_id: string;
  profile_id: string;
  profiles: {
    id: string;
    username: string | null;
    phone: string | null;
  } | null;
  companies: {
    id: string;
    name: string;
    odoo_partner_id: number;
  } | null;
  company_roles: {
    slug: string;
  } | null;
};

function normalizeUnits(
  units: CompanyMemberQueryRow['company_member_units'],
): Array<{ vin: string }> {
  return Array.isArray(units) ? units : [units];
}

function toRecipient(
  row: CompanyMemberQueryRow | CompanyAdminQueryRow,
  vins: string[],
): NotificationRecipient {
  return {
    name: row.profiles?.username ?? 'Unknown',
    phone: row.profiles?.phone ?? null,
    companyId: row.company_id,
    companyName: row.companies?.name ?? '',
    odooPartnerId: row.companies?.odoo_partner_id ?? 0,
    memberId: row.id,
    profileId: row.profile_id,
    roleSlug: row.company_roles?.slug ?? '',
    vins,
  };
}

export class CompanyMembersRepository {
  constructor(private readonly client: SupabaseAdminClient = getSupabaseAdminClient()) {}

  async findWithAssignedUnits(expiringVins: string[]): Promise<CompanyMemberWithUnits[]> {
    if (!expiringVins.length) {
      return [];
    }

    const expiringVinSet = new Set(expiringVins);

    const { data, error } = await this.client
      .from('company_members')
      .select(
        `
        id,
        company_id,
        profile_id,
        profiles!company_members_profile_id_fkey ( id, username, phone ),
        companies ( id, name, odoo_partner_id ),
        company_roles ( slug ),
        company_member_units!inner ( vin )
      `,
      )
      .in('company_member_units.vin', expiringVins);

    if (error) {
      throw new RepositoryError('Unable to load company members with assigned units', error);
    }

    return (data as unknown as CompanyMemberQueryRow[]).map((row) => ({
      id: row.id,
      companyId: row.company_id,
      profileId: row.profile_id,
      profile: {
        id: row.profiles?.id ?? row.profile_id,
        username: row.profiles?.username ?? null,
        phone: row.profiles?.phone ?? null,
      },
      company: {
        id: row.companies?.id ?? row.company_id,
        name: row.companies?.name ?? '',
        odoo_partner_id: row.companies?.odoo_partner_id ?? 0,
      },
      roleSlug: row.company_roles?.slug ?? '',
      vins: normalizeUnits(row.company_member_units)
        .map((unit) => unit.vin)
        .filter((vin) => expiringVinSet.has(vin)),
    }));
  }

  async findNotificationRecipients(expiringVins: string[]): Promise<NotificationRecipient[]> {
    if (!expiringVins.length) {
      return [];
    }

    const expiringVinSet = new Set(expiringVins);
    const members = await this.findWithAssignedUnits(expiringVins);
    const recipients = new Map<string, NotificationRecipient>();

    for (const member of members) {
      if (!member.vins.length) {
        continue;
      }

      recipients.set(member.profileId, {
        name: member.profile.username ?? 'Unknown',
        phone: member.profile.phone,
        companyId: member.companyId,
        companyName: member.company.name,
        odooPartnerId: member.company.odoo_partner_id,
        memberId: member.id,
        profileId: member.profileId,
        roleSlug: member.roleSlug,
        vins: [...member.vins],
      });
    }

    const employeeVinsByCompany = new Map<string, Set<string>>();
    for (const member of members) {
      if (member.roleSlug !== 'company_employee') {
        continue;
      }

      const companyVins = employeeVinsByCompany.get(member.companyId) ?? new Set<string>();
      for (const vin of member.vins) {
        companyVins.add(vin);
      }
      employeeVinsByCompany.set(member.companyId, companyVins);
    }

    const companyIds = [...employeeVinsByCompany.keys()];
    if (!companyIds.length) {
      return [...recipients.values()];
    }

    const { data: adminData, error: adminError } = await this.client
      .from('company_members')
      .select(
        `
        id,
        company_id,
        profile_id,
        profiles!company_members_profile_id_fkey ( id, username, phone ),
        companies ( id, name, odoo_partner_id ),
        company_roles!inner ( slug )
      `,
      )
      .in('company_id', companyIds)
      .eq('company_roles.slug', 'company_admin');

    if (adminError) {
      throw new RepositoryError('Unable to load company admins for notifications', adminError);
    }

    for (const row of adminData as unknown as CompanyAdminQueryRow[]) {
      const employeeVins = employeeVinsByCompany.get(row.company_id);
      if (!employeeVins?.size) {
        continue;
      }

      const existing = recipients.get(row.profile_id);
      const ownVins = existing?.vins ?? [];
      const mergedVins = [...new Set([...ownVins, ...employeeVins])].filter((vin) =>
        expiringVinSet.has(vin),
      );

      if (!mergedVins.length) {
        continue;
      }

      recipients.set(row.profile_id, toRecipient(row, mergedVins));
    }

    return [...recipients.values()];
  }
}

export const companyMembersRepository = new CompanyMembersRepository();
