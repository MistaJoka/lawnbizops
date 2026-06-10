export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

/**
 * Stub for Phase 3+ tables that src/lib/db.ts SyncTable already references
 * but that don't exist in the database yet. `any` keeps the outbox's dynamic
 * supabase.from(op.table) compiling without loosening the real tables below.
 * Remove these as the real tables land and typegen emits them.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FutureTable = { Row: any; Insert: any; Update: any; Relationships: [] }

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      business_settings: {
        Row: {
          address: string
          business_name: string
          created_at: string
          default_due_days: number
          email: string
          estimate_prefix: string
          invoice_prefix: string
          logo_path: string | null
          next_estimate_number: number
          next_invoice_number: number
          payment_provider: string | null
          payment_provider_config: Json
          phone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string
          business_name?: string
          created_at?: string
          default_due_days?: number
          email?: string
          estimate_prefix?: string
          invoice_prefix?: string
          logo_path?: string | null
          next_estimate_number?: number
          next_invoice_number?: number
          payment_provider?: string | null
          payment_provider_config?: Json
          phone?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          address?: string
          business_name?: string
          created_at?: string
          default_due_days?: number
          email?: string
          estimate_prefix?: string
          invoice_prefix?: string
          logo_path?: string | null
          next_estimate_number?: number
          next_invoice_number?: number
          payment_provider?: string | null
          payment_provider_config?: Json
          phone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          archived_at: string | null
          created_at: string
          email: string
          id: string
          name: string
          notes: string
          phone: string
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
          phone?: string
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
          phone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          content: string | null
          embedding: string | null
          id: number
          metadata: Json | null
        }
        Insert: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Update: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Relationships: []
      }
      jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          notes: string
          occurrence_date: string | null
          price_cents: number
          property_id: string
          schedule_id: string | null
          scheduled_date: string
          service_id: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string
          occurrence_date?: string | null
          price_cents?: number
          property_id: string
          schedule_id?: string | null
          scheduled_date: string
          service_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string
          occurrence_date?: string | null
          price_cents?: number
          property_id?: string
          schedule_id?: string | null
          scheduled_date?: string
          service_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
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
      n8n_chat_histories: {
        Row: {
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          id?: number
          message?: Json
          session_id?: string
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
        ]
      }
      property_services: {
        Row: {
          created_at: string
          price_cents: number
          property_id: string
          service_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          price_cents: number
          property_id: string
          service_id: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          price_cents?: number
          property_id?: string
          service_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
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
          paused_at: string | null
          price_cents: number
          property_id: string
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
          paused_at?: string | null
          price_cents?: number
          property_id: string
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
          paused_at?: string | null
          price_cents?: number
          property_id?: string
          service_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
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
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      // Not in the database yet — see FutureTable above.
      estimates: FutureTable
      estimate_items: FutureTable
      invoices: FutureTable
      invoice_items: FutureTable
      payments: FutureTable
      photos: FutureTable
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      materialize_jobs: { Args: { through_date: string }; Returns: number }
      resync_schedule: {
        Args: { p_schedule_id: string; through_date: string }
        Returns: number
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
