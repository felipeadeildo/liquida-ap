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
    PostgrestVersion: '13.0.5'
  }
  public: {
    Tables: {
      bids: {
        Row: {
          created_at: string | null
          id: string
          is_deleted: boolean | null
          item_id: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          item_id: string
          user_id: string
          value: number
        }
        Update: {
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          item_id?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: 'bids_item_id_fkey'
            columns: ['item_id']
            isOneToOne: false
            referencedRelation: 'finishes'
            referencedColumns: ['item_id']
          },
          {
            foreignKeyName: 'bids_item_id_fkey'
            columns: ['item_id']
            isOneToOne: false
            referencedRelation: 'items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bids_item_id_fkey'
            columns: ['item_id']
            isOneToOne: false
            referencedRelation: 'items_with_status'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bids_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bids_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users_public'
            referencedColumns: ['id']
          },
        ]
      }
      donation_claims: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          item_id: string
          message: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          item_id: string
          message?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          item_id?: string
          message?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'donation_claims_item_id_fkey'
            columns: ['item_id']
            isOneToOne: false
            referencedRelation: 'finishes'
            referencedColumns: ['item_id']
          },
          {
            foreignKeyName: 'donation_claims_item_id_fkey'
            columns: ['item_id']
            isOneToOne: false
            referencedRelation: 'items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'donation_claims_item_id_fkey'
            columns: ['item_id']
            isOneToOne: false
            referencedRelation: 'items_with_status'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'donation_claims_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'donation_claims_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users_public'
            referencedColumns: ['id']
          },
        ]
      }
      item_watch: {
        Row: {
          created_at: string
          id: string
          item_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'item_watch_item_id_fkey'
            columns: ['item_id']
            isOneToOne: false
            referencedRelation: 'finishes'
            referencedColumns: ['item_id']
          },
          {
            foreignKeyName: 'item_watch_item_id_fkey'
            columns: ['item_id']
            isOneToOne: false
            referencedRelation: 'items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'item_watch_item_id_fkey'
            columns: ['item_id']
            isOneToOne: false
            referencedRelation: 'items_with_status'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'item_watch_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'item_watch_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users_public'
            referencedColumns: ['id']
          },
        ]
      }
      items: {
        Row: {
          auction_end: string | null
          auction_start: string | null
          bid_step: number
          created_at: string | null
          description: string
          id: string
          is_donation: boolean | null
          payment_status: Database['public']['Enums']['payment_status'] | null
          photos: string[]
          proof_url: string | null
          starting_bid: number | null
          title: string
        }
        Insert: {
          auction_end?: string | null
          auction_start?: string | null
          bid_step: number
          created_at?: string | null
          description: string
          id?: string
          is_donation?: boolean | null
          payment_status?: Database['public']['Enums']['payment_status'] | null
          photos: string[]
          proof_url?: string | null
          starting_bid?: number | null
          title: string
        }
        Update: {
          auction_end?: string | null
          auction_start?: string | null
          bid_step?: number
          created_at?: string | null
          description?: string
          id?: string
          is_donation?: boolean | null
          payment_status?: Database['public']['Enums']['payment_status'] | null
          photos?: string[]
          proof_url?: string | null
          starting_bid?: number | null
          title?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          course: string | null
          created_at: string | null
          email: string
          id: string
          is_insper: boolean | null
          name: string
          photo: string | null
          role: Database['public']['Enums']['user_role']
          semester: string | null
          whatsapp: string
        }
        Insert: {
          course?: string | null
          created_at?: string | null
          email: string
          id: string
          is_insper?: boolean | null
          name: string
          photo?: string | null
          role?: Database['public']['Enums']['user_role']
          semester?: string | null
          whatsapp: string
        }
        Update: {
          course?: string | null
          created_at?: string | null
          email?: string
          id?: string
          is_insper?: boolean | null
          name?: string
          photo?: string | null
          role?: Database['public']['Enums']['user_role']
          semester?: string | null
          whatsapp?: string
        }
        Relationships: []
      }
    }
    Views: {
      finishes: {
        Row: {
          final_value: number | null
          finished_at: string | null
          item_id: string | null
          item_title: string | null
          payment_status: Database['public']['Enums']['payment_status'] | null
          proof_url: string | null
          user_id: string | null
          winner_email: string | null
          winner_name: string | null
          winner_whatsapp: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'bids_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bids_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users_public'
            referencedColumns: ['id']
          },
        ]
      }
      items_with_status: {
        Row: {
          auction_end: string | null
          auction_start: string | null
          bid_step: number | null
          computed_status: Database['public']['Enums']['item_status'] | null
          created_at: string | null
          description: string | null
          id: string | null
          is_accepting_bids: boolean | null
          is_donation: boolean | null
          payment_status: Database['public']['Enums']['payment_status'] | null
          photos: string[] | null
          proof_url: string | null
          seconds_until_end: number | null
          seconds_until_start: number | null
          starting_bid: number | null
          title: string | null
        }
        Insert: {
          auction_end?: string | null
          auction_start?: string | null
          bid_step?: number | null
          computed_status?: never
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_accepting_bids?: never
          is_donation?: boolean | null
          payment_status?: Database['public']['Enums']['payment_status'] | null
          photos?: string[] | null
          proof_url?: string | null
          seconds_until_end?: never
          seconds_until_start?: never
          starting_bid?: number | null
          title?: string | null
        }
        Update: {
          auction_end?: string | null
          auction_start?: string | null
          bid_step?: number | null
          computed_status?: never
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_accepting_bids?: never
          is_donation?: boolean | null
          payment_status?: Database['public']['Enums']['payment_status'] | null
          photos?: string[] | null
          proof_url?: string | null
          seconds_until_end?: never
          seconds_until_start?: never
          starting_bid?: number | null
          title?: string | null
        }
        Relationships: []
      }
      users_public: {
        Row: {
          course: string | null
          created_at: string | null
          id: string | null
          is_insper: boolean | null
          name: string | null
          photo: string | null
          semester: string | null
        }
        Insert: {
          course?: string | null
          created_at?: string | null
          id?: string | null
          is_insper?: boolean | null
          name?: string | null
          photo?: string | null
          semester?: string | null
        }
        Update: {
          course?: string | null
          created_at?: string | null
          id?: string | null
          is_insper?: boolean | null
          name?: string | null
          photo?: string | null
          semester?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_view_finish: { Args: { finish_user_id: string }; Returns: boolean }
      can_view_item: {
        Args: {
          item_computed_status: Database['public']['Enums']['item_status']
          item_status: Database['public']['Enums']['item_status']
        }
        Returns: boolean
      }
      get_user_role: {
        Args: never
        Returns: Database['public']['Enums']['user_role']
      }
      is_admin: { Args: never; Returns: boolean }
      item_accepts_bids: { Args: { item_id: string }; Returns: boolean }
    }
    Enums: {
      item_status: 'draft' | 'scheduled' | 'active' | 'finished'
      payment_status: 'pending' | 'paid' | 'delivered'
      user_role: 'user' | 'admin'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      item_status: ['draft', 'scheduled', 'active', 'finished'],
      payment_status: ['pending', 'paid', 'delivered'],
      user_role: ['user', 'admin'],
    },
  },
} as const
