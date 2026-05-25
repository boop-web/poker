export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      chat_messages: {
        Row: {
          created_at: string;
          id: string;
          message: string;
          table_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          message: string;
          table_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          message?: string;
          table_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_messages_table_id_fkey";
            columns: ["table_id"];
            isOneToOne: false;
            referencedRelation: "poker_tables";
            referencedColumns: ["id"];
          },
        ];
      };
      hand_actions: {
        Row: {
          action: string;
          amount: number;
          created_at: string;
          hand_id: string;
          id: string;
          phase: string;
          user_id: string;
        };
        Insert: {
          action: string;
          amount?: number;
          created_at?: string;
          hand_id: string;
          id?: string;
          phase: string;
          user_id: string;
        };
        Update: {
          action?: string;
          amount?: number;
          created_at?: string;
          hand_id?: string;
          id?: string;
          phase?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "hand_actions_hand_id_fkey";
            columns: ["hand_id"];
            isOneToOne: false;
            referencedRelation: "hands";
            referencedColumns: ["id"];
          },
        ];
      };
      hands: {
        Row: {
          board: Json;
          ended_at: string | null;
          id: string;
          pot: number;
          started_at: string;
          summary: string | null;
          table_id: string;
          winner_seat: number | null;
          winner_user_id: string | null;
        };
        Insert: {
          board?: Json;
          ended_at?: string | null;
          id?: string;
          pot?: number;
          started_at?: string;
          summary?: string | null;
          table_id: string;
          winner_seat?: number | null;
          winner_user_id?: string | null;
        };
        Update: {
          board?: Json;
          ended_at?: string | null;
          id?: string;
          pot?: number;
          started_at?: string;
          summary?: string | null;
          table_id?: string;
          winner_seat?: number | null;
          winner_user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "hands_table_id_fkey";
            columns: ["table_id"];
            isOneToOne: false;
            referencedRelation: "poker_tables";
            referencedColumns: ["id"];
          },
        ];
      };
      poker_tables: {
        Row: {
          big_blind: number;
          created_at: string;
          id: string;
          max_buyin: number;
          max_seats: number;
          min_buyin: number;
          name: string;
          small_blind: number;
          state: Json;
          status: Database["public"]["Enums"]["table_status"];
          updated_at: string;
        };
        Insert: {
          big_blind?: number;
          created_at?: string;
          id?: string;
          max_buyin?: number;
          max_seats?: number;
          min_buyin?: number;
          name: string;
          small_blind?: number;
          state?: Json;
          status?: Database["public"]["Enums"]["table_status"];
          updated_at?: string;
        };
        Update: {
          big_blind?: number;
          created_at?: string;
          id?: string;
          max_buyin?: number;
          max_seats?: number;
          min_buyin?: number;
          name?: string;
          small_blind?: number;
          state?: Json;
          status?: Database["public"]["Enums"]["table_status"];
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          chips: number;
          created_at: string;
          display_name: string | null;
          id: string;
          is_banned: boolean;
          updated_at: string;
          username: string;
        };
        Insert: {
          avatar_url?: string | null;
          chips?: number;
          created_at?: string;
          display_name?: string | null;
          id: string;
          is_banned?: boolean;
          updated_at?: string;
          username: string;
        };
        Update: {
          avatar_url?: string | null;
          chips?: number;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          is_banned?: boolean;
          updated_at?: string;
          username?: string;
        };
        Relationships: [];
      };
      seat_holes: {
        Row: {
          hole_cards: Json;
          seat_id: string;
          table_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          hole_cards?: Json;
          seat_id: string;
          table_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          hole_cards?: Json;
          seat_id?: string;
          table_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "seat_holes_seat_id_fkey";
            columns: ["seat_id"];
            isOneToOne: true;
            referencedRelation: "table_seats";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "seat_holes_table_id_fkey";
            columns: ["table_id"];
            isOneToOne: false;
            referencedRelation: "poker_tables";
            referencedColumns: ["id"];
          },
        ];
      };
      table_seats: {
        Row: {
          chips: number;
          current_bet: number;
          has_acted: boolean;
          has_folded: boolean;
          id: string;
          is_all_in: boolean;
          joined_at: string;
          seat_number: number;
          sitting_out: boolean;
          table_id: string;
          user_id: string;
        };
        Insert: {
          chips: number;
          current_bet?: number;
          has_acted?: boolean;
          has_folded?: boolean;
          id?: string;
          is_all_in?: boolean;
          joined_at?: string;
          seat_number: number;
          sitting_out?: boolean;
          table_id: string;
          user_id: string;
        };
        Update: {
          chips?: number;
          current_bet?: number;
          has_acted?: boolean;
          has_folded?: boolean;
          id?: string;
          is_all_in?: boolean;
          joined_at?: string;
          seat_number?: number;
          sitting_out?: boolean;
          table_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "table_seats_table_id_fkey";
            columns: ["table_id"];
            isOneToOne: false;
            referencedRelation: "poker_tables";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "moderator" | "user";
      table_status: "waiting" | "playing" | "paused";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      table_status: ["waiting", "playing", "paused"],
    },
  },
} as const;
