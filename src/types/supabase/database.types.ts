export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          odoo_partner_id: number;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          odoo_partner_id: number;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          odoo_partner_id?: number;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      company_member_permissions: {
        Row: {
          company_member_id: string;
          permission_id: string;
          granted_by: string | null;
          created_at: string;
        };
        Insert: {
          company_member_id: string;
          permission_id: string;
          granted_by?: string | null;
          created_at?: string;
        };
        Update: {
          company_member_id?: string;
          permission_id?: string;
          granted_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      company_member_units: {
        Row: {
          id: string;
          company_member_id: string;
          vin: string;
          assigned_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_member_id: string;
          vin: string;
          assigned_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_member_id?: string;
          vin?: string;
          assigned_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      company_members: {
        Row: {
          id: string;
          company_id: string;
          profile_id: string;
          company_role_id: string;
          invited_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          profile_id: string;
          company_role_id: string;
          invited_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          profile_id?: string;
          company_role_id?: string;
          invited_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      company_roles: {
        Row: {
          id: string;
          name: string;
          slug: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
        };
        Relationships: [];
      };
      cron_job_runs: {
        Row: {
          id: string;
          job_id: string;
          status: 'running' | 'success' | 'failed' | 'skipped' | 'timeout';
          triggered_by: 'schedule' | 'manual' | 'startup' | 'system';
          worker_id: string;
          started_at: string;
          finished_at: string | null;
          duration_ms: number | null;
          error_message: string | null;
          metadata: Json;
        };
        Insert: {
          id?: string;
          job_id: string;
          status?: 'running' | 'success' | 'failed' | 'skipped' | 'timeout';
          triggered_by?: 'schedule' | 'manual' | 'startup' | 'system';
          worker_id: string;
          started_at?: string;
          finished_at?: string | null;
          duration_ms?: number | null;
          error_message?: string | null;
          metadata?: Json;
        };
        Update: {
          id?: string;
          job_id?: string;
          status?: 'running' | 'success' | 'failed' | 'skipped' | 'timeout';
          triggered_by?: 'schedule' | 'manual' | 'startup' | 'system';
          worker_id?: string;
          started_at?: string;
          finished_at?: string | null;
          duration_ms?: number | null;
          error_message?: string | null;
          metadata?: Json;
        };
        Relationships: [];
      };
      cron_jobs: {
        Row: {
          id: string;
          key: string;
          name: string;
          description: string | null;
          provider: 'odoo' | 'supabase' | 'internal';
          task_key: string;
          schedule: string;
          timezone: string;
          enabled: boolean;
          no_overlap: boolean;
          max_runtime_seconds: number;
          config: Json;
          lock_owner: string | null;
          locked_until: string | null;
          last_run_at: string | null;
          next_run_at: string | null;
          last_status: 'running' | 'success' | 'failed' | 'skipped' | 'timeout' | null;
          last_error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          name: string;
          description?: string | null;
          provider: 'odoo' | 'supabase' | 'internal';
          task_key: string;
          schedule: string;
          timezone?: string;
          enabled?: boolean;
          no_overlap?: boolean;
          max_runtime_seconds?: number;
          config?: Json;
          lock_owner?: string | null;
          locked_until?: string | null;
          last_run_at?: string | null;
          next_run_at?: string | null;
          last_status?: 'running' | 'success' | 'failed' | 'skipped' | 'timeout' | null;
          last_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          name?: string;
          description?: string | null;
          provider?: 'odoo' | 'supabase' | 'internal';
          task_key?: string;
          schedule?: string;
          timezone?: string;
          enabled?: boolean;
          no_overlap?: boolean;
          max_runtime_seconds?: number;
          config?: Json;
          lock_owner?: string | null;
          locked_until?: string | null;
          last_run_at?: string | null;
          next_run_at?: string | null;
          last_status?: 'running' | 'success' | 'failed' | 'skipped' | 'timeout' | null;
          last_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      permissions: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          role_id: string;
          company_id: string | null;
          username: string | null;
          phone: string | null;
          updated_at: string;
          avatar_url: string | null;
        };
        Insert: {
          id: string;
          role_id: string;
          company_id?: string | null;
          username?: string | null;
          phone?: string | null;
          updated_at?: string;
          avatar_url?: string | null;
        };
        Update: {
          id?: string;
          role_id?: string;
          company_id?: string | null;
          username?: string | null;
          phone?: string | null;
          updated_at?: string;
          avatar_url?: string | null;
        };
        Relationships: [];
      };
      role_permissions: {
        Row: {
          role_id: string;
          permission_id: string;
        };
        Insert: {
          role_id: string;
          permission_id: string;
        };
        Update: {
          role_id?: string;
          permission_id?: string;
        };
        Relationships: [];
      };
      roles: {
        Row: {
          id: string;
          name: string;
          slug: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
        };
        Relationships: [];
      };
      whatsapp_message_context: {
        Row: {
          id: string;
          phone: string;
          serial_ending: string;
          template: string;
          message_sid: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          phone: string;
          serial_ending: string;
          template: string;
          message_sid?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          phone?: string;
          serial_ending?: string;
          template?: string;
          message_sid?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      template_classifications: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notification_templates: {
        Row: {
          id: string;
          classification_id: string;
          name: string;
          channel: 'email' | 'whatsapp';
          is_active: boolean;
          html_body: string | null;
          default_subject: string | null;
          content_sid: string | null;
          variables: Json | null;
          correlation_var: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          classification_id: string;
          name: string;
          channel: 'email' | 'whatsapp';
          is_active?: boolean;
          html_body?: string | null;
          default_subject?: string | null;
          content_sid?: string | null;
          variables?: Json | null;
          correlation_var?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          classification_id?: string;
          name?: string;
          channel?: 'email' | 'whatsapp';
          is_active?: boolean;
          html_body?: string | null;
          default_subject?: string | null;
          content_sid?: string | null;
          variables?: Json | null;
          correlation_var?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      claim_cron_job: {
        Args: {
          p_job_id: string;
          p_worker_id: string;
        };
        Returns: Database['public']['Tables']['cron_jobs']['Row'] | null;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
