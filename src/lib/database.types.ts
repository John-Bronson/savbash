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
      comments: {
        Row: {
          body: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_deleted: boolean
          ride_id: string
          updated_at: string | null
          updated_by: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          ride_id: string
          updated_at?: string | null
          updated_by?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          ride_id?: string
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      instruments: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: never
          name: string
        }
        Update: {
          id?: never
          name?: string
        }
        Relationships: []
      }
      mentions: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          is_read: boolean
          mentioned_user_id: string
          ride_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          mentioned_user_id: string
          ride_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          mentioned_user_id?: string
          ride_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentions_mentioned_user_id_fkey"
            columns: ["mentioned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentions_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_emoji: string | null
          avatar_url: string | null
          bash_name: string | null
          christian_name: string
          created_at: string
          email: string | null
          id: string
          notify_on_mention: boolean
          role: string
          subscribed_to_emails: boolean
        }
        Insert: {
          avatar_emoji?: string | null
          avatar_url?: string | null
          bash_name?: string | null
          christian_name: string
          created_at?: string
          email?: string | null
          id: string
          notify_on_mention?: boolean
          role?: string
          subscribed_to_emails?: boolean
        }
        Update: {
          avatar_emoji?: string | null
          avatar_url?: string | null
          bash_name?: string | null
          christian_name?: string
          created_at?: string
          email?: string | null
          id?: string
          notify_on_mention?: boolean
          role?: string
          subscribed_to_emails?: boolean
        }
        Relationships: []
      }
      reactions: {
        Row: {
          comment_id: string
          created_at: string
          emoji: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          emoji: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          emoji?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ride_hares: {
        Row: {
          created_at: string
          id: string
          name: string | null
          ride_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          ride_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          ride_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ride_hares_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_hares_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ride_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          photo_url: string
          ride_id: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          photo_url: string
          ride_id: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          photo_url?: string
          ride_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ride_photos_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_photos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rides: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          image_url: string | null
          meeting_spot_lat: number | null
          meeting_spot_lng: number | null
          meeting_spot_name: string
          ride_date: string
          title: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          image_url?: string | null
          meeting_spot_lat?: number | null
          meeting_spot_lng?: number | null
          meeting_spot_name: string
          ride_date: string
          title: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          image_url?: string | null
          meeting_spot_lat?: number | null
          meeting_spot_lng?: number | null
          meeting_spot_name?: string
          ride_date?: string
          title?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rides_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rides_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rsvps: {
        Row: {
          created_at: string
          id: string
          ride_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ride_id: string
          status: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ride_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rsvps_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rsvps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_role: { Args: never; Returns: string }
      is_hare_for_ride: { Args: { p_ride_id: string }; Returns: boolean }
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
