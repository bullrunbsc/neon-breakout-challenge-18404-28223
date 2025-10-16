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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      answers: {
        Row: {
          id: string
          is_correct: boolean
          player_id: string
          round_id: string
          selected_door: number
          submitted_at: string
        }
        Insert: {
          id?: string
          is_correct: boolean
          player_id: string
          round_id: string
          selected_door?: number
          submitted_at?: string
        }
        Update: {
          id?: string
          is_correct?: boolean
          player_id?: string
          round_id?: string
          selected_door?: number
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "answers_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          break_ends_at: string | null
          created_at: string
          current_round: number
          ended_at: string | null
          id: string
          started_at: string | null
          status: Database["public"]["Enums"]["game_status"]
          total_rounds: number
          updated_at: string
        }
        Insert: {
          break_ends_at?: string | null
          created_at?: string
          current_round?: number
          ended_at?: string | null
          id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["game_status"]
          total_rounds?: number
          updated_at?: string
        }
        Update: {
          break_ends_at?: string | null
          created_at?: string
          current_round?: number
          ended_at?: string | null
          id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["game_status"]
          total_rounds?: number
          updated_at?: string
        }
        Relationships: []
      }
      payouts: {
        Row: {
          amount: string
          created_at: string
          id: string
          transaction_hash: string
          winner_wallet: string
        }
        Insert: {
          amount: string
          created_at?: string
          id?: string
          transaction_hash: string
          winner_wallet: string
        }
        Update: {
          amount?: string
          created_at?: string
          id?: string
          transaction_hash?: string
          winner_wallet?: string
        }
        Relationships: []
      }
      players: {
        Row: {
          eliminated_at: string | null
          game_id: string
          id: string
          joined_at: string
          status: Database["public"]["Enums"]["player_status"]
          wallet_address: string
          winner_rank: number | null
        }
        Insert: {
          eliminated_at?: string | null
          game_id: string
          id?: string
          joined_at?: string
          status?: Database["public"]["Enums"]["player_status"]
          wallet_address: string
          winner_rank?: number | null
        }
        Update: {
          eliminated_at?: string | null
          game_id?: string
          id?: string
          joined_at?: string
          status?: Database["public"]["Enums"]["player_status"]
          wallet_address?: string
          winner_rank?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "players_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      rounds: {
        Row: {
          correct_door: number
          created_at: string
          ends_at: string
          game_id: string
          id: string
          round_number: number
          starts_at: string
        }
        Insert: {
          correct_door?: number
          created_at?: string
          ends_at: string
          game_id: string
          id?: string
          round_number: number
          starts_at: string
        }
        Update: {
          correct_door?: number
          created_at?: string
          ends_at?: string
          game_id?: string
          id?: string
          round_number?: number
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rounds_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      players_public: {
        Row: {
          eliminated_at: string | null
          game_id: string | null
          id: string | null
          joined_at: string | null
          status: Database["public"]["Enums"]["player_status"] | null
        }
        Insert: {
          eliminated_at?: string | null
          game_id?: string | null
          id?: string | null
          joined_at?: string | null
          status?: Database["public"]["Enums"]["player_status"] | null
        }
        Update: {
          eliminated_at?: string | null
          game_id?: string | null
          id?: string | null
          joined_at?: string | null
          status?: Database["public"]["Enums"]["player_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "players_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      rounds_safe: {
        Row: {
          created_at: string | null
          ends_at: string | null
          game_id: string | null
          id: string | null
          round_number: number | null
          starts_at: string | null
        }
        Insert: {
          created_at?: string | null
          ends_at?: string | null
          game_id?: string | null
          id?: string | null
          round_number?: number | null
          starts_at?: string | null
        }
        Update: {
          created_at?: string | null
          ends_at?: string | null
          game_id?: string | null
          id?: string | null
          round_number?: number | null
          starts_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rounds_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_create_round: {
        Args: {
          p_correct_door: number
          p_ends_at: string
          p_game_id: string
          p_round_number: number
          p_starts_at: string
        }
        Returns: {
          correct_door: number
          created_at: string
          ends_at: string
          game_id: string
          id: string
          round_number: number
          starts_at: string
        }[]
      }
      admin_get_round: {
        Args: { p_game_id: string; p_round_number: number }
        Returns: {
          correct_door: number
          created_at: string
          ends_at: string
          game_id: string
          id: string
          round_number: number
          starts_at: string
        }[]
      }
      get_current_round_safe: {
        Args: { p_game_id: string }
        Returns: {
          created_at: string
          ends_at: string
          game_id: string
          id: string
          round_number: number
          starts_at: string
        }[]
      }
      get_round_safe: {
        Args: { p_game_id: string; p_round_number: number }
        Returns: {
          created_at: string
          ends_at: string
          game_id: string
          id: string
          round_number: number
          starts_at: string
        }[]
      }
      is_admin: {
        Args: { check_user_id: string }
        Returns: boolean
      }
      validate_answer: {
        Args: {
          p_player_id: string
          p_round_id: string
          p_selected_door: number
        }
        Returns: {
          already_submitted: boolean
          is_correct: boolean
        }[]
      }
    }
    Enums: {
      game_status: "waiting" | "countdown" | "active" | "finished" | "break"
      player_status: "active" | "eliminated" | "winner"
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
    Enums: {
      game_status: ["waiting", "countdown", "active", "finished", "break"],
      player_status: ["active", "eliminated", "winner"],
    },
  },
} as const
