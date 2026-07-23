export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          body: string
          client_id: string | null
          created_at: string
          id: string
          job_id: string | null
          kind: string
          org_id: string
          user_id: string | null
        }
        Insert: {
          body?: string
          client_id?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          kind?: string
          org_id?: string
          user_id?: string | null
        }
        Update: {
          body?: string
          client_id?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          kind?: string
          org_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      business_settings: {
        Row: {
          address: string
          auto_followup_after_job: boolean
          auto_followup_days: number
          auto_overdue_days: number
          auto_overdue_reminder: boolean
          business_entity: string
          business_name: string
          created_at: string
          default_due_days: number
          email: string
          email_appointment_reminders: boolean
          email_overdue_reminders: boolean
          estimate_prefix: string
          intake_token: string
          invoice_prefix: string
          logo_path: string | null
          mileage_rate_cents: number
          next_estimate_number: number
          next_invoice_number: number
          onboarded_at: string | null
          org_id: string
          payment_provider: string | null
          payment_provider_config: Json
          phone: string
          quarterly_set_aside_pct: number
          review_url: string
          sales_tax_bps: number
          tax_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string
          auto_followup_after_job?: boolean
          auto_followup_days?: number
          auto_overdue_days?: number
          auto_overdue_reminder?: boolean
          business_entity?: string
          business_name?: string
          created_at?: string
          default_due_days?: number
          email?: string
          email_appointment_reminders?: boolean
          email_overdue_reminders?: boolean
          estimate_prefix?: string
          intake_token?: string
          invoice_prefix?: string
          logo_path?: string | null
          mileage_rate_cents?: number
          next_estimate_number?: number
          next_invoice_number?: number
          onboarded_at?: string | null
          org_id?: string
          payment_provider?: string | null
          payment_provider_config?: Json
          phone?: string
          quarterly_set_aside_pct?: number
          review_url?: string
          sales_tax_bps?: number
          tax_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string
          auto_followup_after_job?: boolean
          auto_followup_days?: number
          auto_overdue_days?: number
          auto_overdue_reminder?: boolean
          business_entity?: string
          business_name?: string
          created_at?: string
          default_due_days?: number
          email?: string
          email_appointment_reminders?: boolean
          email_overdue_reminders?: boolean
          estimate_prefix?: string
          intake_token?: string
          invoice_prefix?: string
          logo_path?: string | null
          mileage_rate_cents?: number
          next_estimate_number?: number
          next_invoice_number?: number
          onboarded_at?: string | null
          org_id?: string
          payment_provider?: string | null
          payment_provider_config?: Json
          phone?: string
          quarterly_set_aside_pct?: number
          review_url?: string
          sales_tax_bps?: number
          tax_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          archived_at: string | null
          created_at: string
          email: string
          id: string
          name: string
          notes: string
          org_id: string
          phone: string
          stage: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          email?: string
          id?: string
          name: string
          notes?: string
          org_id?: string
          phone?: string
          stage?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          notes?: string
          org_id?: string
          phone?: string
          stage?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_outbox: {
        Row: {
          attempts: number
          created_at: string
          entity_id: string
          error: string
          id: string
          org_id: string
          provider_id: string
          send_date: string
          sent_at: string | null
          status: string
          template: string
          to_email: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          entity_id: string
          error?: string
          id: string
          org_id: string
          provider_id?: string
          send_date?: string
          sent_at?: string | null
          status?: string
          template: string
          to_email: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          entity_id?: string
          error?: string
          id?: string
          org_id?: string
          provider_id?: string
          send_date?: string
          sent_at?: string | null
          status?: string
          template?: string
          to_email?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_outbox_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_items: {
        Row: {
          created_at: string
          description: string
          estimate_id: string
          id: string
          org_id: string
          quantity: number
          sort_order: number
          unit_price_cents: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          estimate_id: string
          id?: string
          org_id?: string
          quantity?: number
          sort_order?: number
          unit_price_cents?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          description?: string
          estimate_id?: string
          id?: string
          org_id?: string
          quantity?: number
          sort_order?: number
          unit_price_cents?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimate_items_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      estimates: {
        Row: {
          approval_token: string
          client_id: string
          created_at: string
          decline_reason: string
          id: string
          issued_at: string
          notes: string
          number: string | null
          org_id: string
          property_id: string | null
          sent_at: string | null
          status: string
          updated_at: string
          user_id: string
          valid_until: string | null
        }
        Insert: {
          approval_token?: string
          client_id: string
          created_at?: string
          decline_reason?: string
          id?: string
          issued_at?: string
          notes?: string
          number?: string | null
          org_id?: string
          property_id?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          valid_until?: string | null
        }
        Update: {
          approval_token?: string
          client_id?: string
          created_at?: string
          decline_reason?: string
          id?: string
          issued_at?: string
          notes?: string
          number?: string | null
          org_id?: string
          property_id?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estimates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount_cents: number
          category: string
          client_id: string | null
          created_at: string
          id: string
          job_id: string | null
          note: string
          org_id: string
          payee_id: string | null
          payment_method: string
          spent_on: string
          updated_at: string
          user_id: string | null
          vendor: string
        }
        Insert: {
          amount_cents?: number
          category?: string
          client_id?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          note?: string
          org_id?: string
          payee_id?: string | null
          payment_method?: string
          spent_on?: string
          updated_at?: string
          user_id?: string | null
          vendor?: string
        }
        Update: {
          amount_cents?: number
          category?: string
          client_id?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          note?: string
          org_id?: string
          payee_id?: string | null
          payment_method?: string
          spent_on?: string
          updated_at?: string
          user_id?: string | null
          vendor?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_payee_id_fkey"
            columns: ["payee_id"]
            isOneToOne: false
            referencedRelation: "vendors_1099"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          archived_at: string | null
          category: string
          created_at: string
          id: string
          location: string
          name: string
          notes: string
          org_id: string
          quantity: number
          reorder_level: number
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          category?: string
          created_at?: string
          id?: string
          location?: string
          name: string
          notes?: string
          org_id?: string
          quantity?: number
          reorder_level?: number
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          archived_at?: string | null
          category?: string
          created_at?: string
          id?: string
          location?: string
          name?: string
          notes?: string
          org_id?: string
          quantity?: number
          reorder_level?: number
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          job_id: string | null
          org_id: string
          quantity: number
          sort_order: number
          unit_price_cents: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          job_id?: string | null
          org_id?: string
          quantity?: number
          sort_order?: number
          unit_price_cents?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          job_id?: string | null
          org_id?: string
          quantity?: number
          sort_order?: number
          unit_price_cents?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice_balances"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_id: string
          created_at: string
          due_at: string | null
          estimate_id: string | null
          id: string
          is_deposit: boolean
          issued_at: string
          last_reminded_at: string | null
          notes: string
          number: string | null
          org_id: string
          sent_at: string | null
          status: string
          tax_bps: number
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          due_at?: string | null
          estimate_id?: string | null
          id?: string
          is_deposit?: boolean
          issued_at?: string
          last_reminded_at?: string | null
          notes?: string
          number?: string | null
          org_id?: string
          sent_at?: string | null
          status?: string
          tax_bps?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          due_at?: string | null
          estimate_id?: string | null
          id?: string
          is_deposit?: boolean
          issued_at?: string
          last_reminded_at?: string | null
          notes?: string
          number?: string | null
          org_id?: string
          sent_at?: string | null
          status?: string
          tax_bps?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          checklist: Json
          completed_at: string | null
          created_at: string
          customized_at: string | null
          id: string
          notes: string
          occurrence_date: string | null
          org_id: string
          price_cents: number
          property_id: string
          schedule_id: string | null
          scheduled_date: string
          service_id: string | null
          start_time: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          checklist?: Json
          completed_at?: string | null
          created_at?: string
          customized_at?: string | null
          id?: string
          notes?: string
          occurrence_date?: string | null
          org_id?: string
          price_cents?: number
          property_id: string
          schedule_id?: string | null
          scheduled_date: string
          service_id?: string | null
          start_time?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          checklist?: Json
          completed_at?: string | null
          created_at?: string
          customized_at?: string | null
          id?: string
          notes?: string
          occurrence_date?: string | null
          org_id?: string
          price_cents?: number
          property_id?: string
          schedule_id?: string | null
          scheduled_date?: string
          service_id?: string | null
          start_time?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "recurring_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          id: string
          org_id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      mileage_logs: {
        Row: {
          client_id: string | null
          created_at: string
          drove_on: string
          id: string
          job_id: string | null
          miles: number
          org_id: string
          purpose: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          drove_on?: string
          id?: string
          job_id?: string | null
          miles?: number
          org_id?: string
          purpose?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          drove_on?: string
          id?: string
          job_id?: string | null
          miles?: number
          org_id?: string
          purpose?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mileage_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mileage_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mileage_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          invoice_id: string
          method: string
          note: string
          org_id: string
          paid_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          id?: string
          invoice_id: string
          method: string
          note?: string
          org_id?: string
          paid_at?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          invoice_id?: string
          method?: string
          note?: string
          org_id?: string
          paid_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice_balances"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          org_id: string
          storage_path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          org_id?: string
          storage_path: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          org_id?: string
          storage_path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          active: boolean
          id: string
          interval: string
          name: string
          price_cents: number
        }
        Insert: {
          active?: boolean
          id: string
          interval?: string
          name: string
          price_cents?: number
        }
        Update: {
          active?: boolean
          id?: string
          interval?: string
          name?: string
          price_cents?: number
        }
        Relationships: []
      }
      properties: {
        Row: {
          address_line1: string
          address_line2: string
          archived_at: string | null
          city: string
          client_id: string
          created_at: string
          gate_code: string
          id: string
          label: string
          lat: number | null
          lng: number | null
          notes: string
          org_id: string
          property_type: string
          state: string
          updated_at: string
          user_id: string
          zip: string
        }
        Insert: {
          address_line1?: string
          address_line2?: string
          archived_at?: string | null
          city?: string
          client_id: string
          created_at?: string
          gate_code?: string
          id?: string
          label?: string
          lat?: number | null
          lng?: number | null
          notes?: string
          org_id?: string
          property_type?: string
          state?: string
          updated_at?: string
          user_id?: string
          zip?: string
        }
        Update: {
          address_line1?: string
          address_line2?: string
          archived_at?: string | null
          city?: string
          client_id?: string
          created_at?: string
          gate_code?: string
          id?: string
          label?: string
          lat?: number | null
          lng?: number | null
          notes?: string
          org_id?: string
          property_type?: string
          state?: string
          updated_at?: string
          user_id?: string
          zip?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      property_services: {
        Row: {
          created_at: string
          org_id: string
          price_cents: number
          property_id: string
          service_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          org_id?: string
          price_cents: number
          property_id: string
          service_id: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          org_id?: string
          price_cents?: number
          property_id?: string
          service_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_services_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_services_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_schedules: {
        Row: {
          anchor_date: string
          cadence: string
          created_at: string
          day_of_month: number | null
          ends_on: string | null
          id: string
          last_materialized_through: string | null
          notes: string
          org_id: string
          paused_at: string | null
          price_cents: number
          property_id: string
          resume_on: string | null
          service_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          anchor_date: string
          cadence: string
          created_at?: string
          day_of_month?: number | null
          ends_on?: string | null
          id?: string
          last_materialized_through?: string | null
          notes?: string
          org_id?: string
          paused_at?: string | null
          price_cents?: number
          property_id: string
          resume_on?: string | null
          service_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          anchor_date?: string
          cadence?: string
          created_at?: string
          day_of_month?: number | null
          ends_on?: string | null
          id?: string
          last_materialized_through?: string | null
          notes?: string
          org_id?: string
          paused_at?: string | null
          price_cents?: number
          property_id?: string
          resume_on?: string | null
          service_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_schedules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_schedules_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_schedules_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          archived_at: string | null
          created_at: string
          default_price_cents: number
          description: string
          id: string
          name: string
          org_id: string
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          default_price_cents?: number
          description?: string
          id?: string
          name: string
          org_id?: string
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          default_price_cents?: number
          description?: string
          id?: string
          name?: string
          org_id?: string
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          org_id: string
          plan_id: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          org_id: string
          plan_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          org_id?: string
          plan_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          client_id: string | null
          created_at: string
          done: boolean
          due_date: string | null
          id: string
          org_id: string
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          done?: boolean
          due_date?: string | null
          id?: string
          org_id?: string
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          done?: boolean
          due_date?: string | null
          id?: string
          org_id?: string
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors_1099: {
        Row: {
          address: string
          created_at: string
          email: string
          id: string
          name: string
          org_id: string
          tax_id: string
          track_1099: boolean
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string
          created_at?: string
          email?: string
          id?: string
          name: string
          org_id?: string
          tax_id?: string
          track_1099?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          org_id?: string
          tax_id?: string
          track_1099?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_1099_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      invoice_balances: {
        Row: {
          balance_cents: number | null
          client_id: string | null
          due_at: string | null
          estimate_id: string | null
          invoice_id: string | null
          is_deposit: boolean | null
          issued_at: string | null
          last_reminded_at: string | null
          number: string | null
          paid_cents: number | null
          status: string | null
          subtotal_cents: number | null
          tax_bps: number | null
          tax_cents: number | null
          total_cents: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      app_state: {
        Args: never
        Returns: {
          access: boolean
          onboarded: boolean
          status: string
          trial_ends_at: string
        }[]
      }
      apply_payment: {
        Args: {
          p_amount_cents: number
          p_id: string
          p_invoice_id: string
          p_method: string
          p_note?: string
          p_paid_at?: string
        }
        Returns: undefined
      }
      automation_sweep: { Args: never; Returns: number }
      claim_queued_emails: {
        Args: { p_limit?: number }
        Returns: {
          attempts: number
          created_at: string
          entity_id: string
          error: string
          id: string
          org_id: string
          provider_id: string
          send_date: string
          sent_at: string | null
          status: string
          template: string
          to_email: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "email_outbox"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      client_profitability: {
        Args: { p_end: string; p_start: string }
        Returns: {
          client_id: string
          cost_cents: number
          name: string
          profit_cents: number
          revenue_cents: number
        }[]
      }
      current_org: { Args: never; Returns: string }
      dashboard_metrics: {
        Args: {
          p_month_start: string
          p_today: string
          p_week_end: string
          p_week_start: string
        }
        Returns: {
          active: number
          collected_cents: number
          dormant: number
          jobs_done_week: number
          jobs_week: number
          leads: number
          open_tasks: number
          outstanding_cents: number
          overdue_tasks: number
          pipeline_cents: number
          quoted: number
        }[]
      }
      estimate_by_token: { Args: { p_token: string }; Returns: Json }
      expenses_by_category: {
        Args: { p_end: string; p_start: string }
        Returns: {
          category: string
          total_cents: number
        }[]
      }
      income_by_method: {
        Args: { p_end: string; p_start: string }
        Returns: {
          method: string
          total_cents: number
        }[]
      }
      intake_business_name: { Args: { p_token: string }; Returns: string }
      job_profitability: {
        Args: { p_end: string; p_start: string }
        Returns: {
          client_id: string
          cost_cents: number
          job_id: string
          profit_cents: number
          revenue_cents: number
          title: string
        }[]
      }
      kick_email_drain: { Args: never; Returns: undefined }
      materialize_jobs: { Args: { through_date: string }; Returns: number }
      materialize_jobs_all: { Args: never; Returns: number }
      pnl_summary: {
        Args: { p_end: string; p_start: string }
        Returns: {
          expense_cents: number
          income_cents: number
          net_cents: number
        }[]
      }
      queue_email: {
        Args: { p_entity_id: string; p_id: string; p_template: string }
        Returns: undefined
      }
      respond_to_estimate: {
        Args: { p_action: string; p_reason?: string; p_token: string }
        Returns: string
      }
      resync_schedule: {
        Args: { p_schedule_id: string; through_date: string }
        Returns: number
      }
      submit_lead: {
        Args: {
          p_address: string
          p_email: string
          p_name: string
          p_notes: string
          p_phone: string
          p_token: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
