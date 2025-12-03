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
      player_week_stats: {
        Row: {
          created_at: string
          fantasy_points_standard: number | null
          fumbles_lost: number | null
          id: string
          interceptions: number | null
          pass_tds: number | null
          pass_yds: number | null
          player_id: number
          player_name: string | null
          raw_json: Json | null
          rec_tds: number | null
          rec_yds: number | null
          rush_tds: number | null
          rush_yds: number | null
          season: number
          updated_at: string
          week: number
        }
        Insert: {
          created_at?: string
          fantasy_points_standard?: number | null
          fumbles_lost?: number | null
          id?: string
          interceptions?: number | null
          pass_tds?: number | null
          pass_yds?: number | null
          player_id: number
          player_name?: string | null
          raw_json?: Json | null
          rec_tds?: number | null
          rec_yds?: number | null
          rush_tds?: number | null
          rush_yds?: number | null
          season?: number
          updated_at?: string
          week: number
        }
        Update: {
          created_at?: string
          fantasy_points_standard?: number | null
          fumbles_lost?: number | null
          id?: string
          interceptions?: number | null
          pass_tds?: number | null
          pass_yds?: number | null
          player_id?: number
          player_name?: string | null
          raw_json?: Json | null
          rec_tds?: number | null
          rec_yds?: number | null
          rush_tds?: number | null
          rush_yds?: number | null
          season?: number
          updated_at?: string
          week?: number
        }
        Relationships: []
      }
      players: {
        Row: {
          api_player_id: string
          created_at: string | null
          first_name: string | null
          full_name: string
          id: string
          jersey_number: string | null
          last_name: string | null
          position: string
          season: number
          status: string | null
          team_abbr: string | null
          team_api_id: string | null
          team_name: string | null
          updated_at: string | null
        }
        Insert: {
          api_player_id: string
          created_at?: string | null
          first_name?: string | null
          full_name: string
          id?: string
          jersey_number?: string | null
          last_name?: string | null
          position: string
          season: number
          status?: string | null
          team_abbr?: string | null
          team_api_id?: string | null
          team_name?: string | null
          updated_at?: string | null
        }
        Update: {
          api_player_id?: string
          created_at?: string | null
          first_name?: string | null
          full_name?: string
          id?: string
          jersey_number?: string | null
          last_name?: string | null
          position?: string
          season?: number
          status?: string | null
          team_abbr?: string | null
          team_api_id?: string | null
          team_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      playoff_games: {
        Row: {
          away_score: number | null
          away_team_external_id: number
          away_team_id: string | null
          created_at: string
          game_id: number
          home_score: number | null
          home_team_external_id: number
          home_team_id: string | null
          id: string
          kickoff_at: string | null
          season: number
          stage: string
          status_long: string | null
          status_short: string | null
          updated_at: string
          venue_city: string | null
          venue_name: string | null
          week_index: number
          week_label: string
        }
        Insert: {
          away_score?: number | null
          away_team_external_id: number
          away_team_id?: string | null
          created_at?: string
          game_id: number
          home_score?: number | null
          home_team_external_id: number
          home_team_id?: string | null
          id?: string
          kickoff_at?: string | null
          season: number
          stage: string
          status_long?: string | null
          status_short?: string | null
          updated_at?: string
          venue_city?: string | null
          venue_name?: string | null
          week_index: number
          week_label: string
        }
        Update: {
          away_score?: number | null
          away_team_external_id?: number
          away_team_id?: string | null
          created_at?: string
          game_id?: number
          home_score?: number | null
          home_team_external_id?: number
          home_team_id?: string | null
          id?: string
          kickoff_at?: string | null
          season?: number
          stage?: string
          status_long?: string | null
          status_short?: string | null
          updated_at?: string
          venue_city?: string | null
          venue_name?: string | null
          week_index?: number
          week_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "playoff_games_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "playoff_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playoff_games_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "playoff_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      playoff_players: {
        Row: {
          created_at: string
          group: string | null
          id: string
          image_url: string | null
          name: string
          number: string | null
          player_id: number
          position: string
          season: number
          team_id: number
          team_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          group?: string | null
          id?: string
          image_url?: string | null
          name: string
          number?: string | null
          player_id: number
          position: string
          season?: number
          team_id: number
          team_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          group?: string | null
          id?: string
          image_url?: string | null
          name?: string
          number?: string | null
          player_id?: number
          position?: string
          season?: number
          team_id?: number
          team_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      playoff_teams: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          made_playoffs: boolean
          name: string
          season: number
          team_id: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          made_playoffs?: boolean
          name: string
          season?: number
          team_id: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          made_playoffs?: boolean
          name?: string
          season?: number
          team_id?: number
          updated_at?: string
        }
        Relationships: []
      }
      regular_season_games: {
        Row: {
          api_game_id: number
          away_team_abbr: string | null
          away_team_api_id: number
          away_team_name: string
          created_at: string
          game_date: string | null
          home_team_abbr: string | null
          home_team_api_id: number
          home_team_name: string
          id: string
          season: number
          season_type: string
          status: string | null
          updated_at: string
          venue: string | null
          week: number
        }
        Insert: {
          api_game_id: number
          away_team_abbr?: string | null
          away_team_api_id: number
          away_team_name: string
          created_at?: string
          game_date?: string | null
          home_team_abbr?: string | null
          home_team_api_id: number
          home_team_name: string
          id?: string
          season: number
          season_type?: string
          status?: string | null
          updated_at?: string
          venue?: string | null
          week: number
        }
        Update: {
          api_game_id?: number
          away_team_abbr?: string | null
          away_team_api_id?: number
          away_team_name?: string
          created_at?: string
          game_date?: string | null
          home_team_abbr?: string | null
          home_team_api_id?: number
          home_team_name?: string
          id?: string
          season?: number
          season_type?: string
          status?: string | null
          updated_at?: string
          venue?: string | null
          week?: number
        }
        Relationships: []
      }
      scoring_settings: {
        Row: {
          created_at: string
          fumble_lost_points: number
          id: string
          interception_points: number
          is_active: boolean
          name: string
          pass_td_points: number
          pass_yds_per_point: number
          rec_td_points: number
          rec_yds_per_point: number
          rush_td_points: number
          rush_yds_per_point: number
          two_pt_conversion_pts: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          fumble_lost_points?: number
          id?: string
          interception_points?: number
          is_active?: boolean
          name: string
          pass_td_points?: number
          pass_yds_per_point?: number
          rec_td_points?: number
          rec_yds_per_point?: number
          rush_td_points?: number
          rush_yds_per_point?: number
          two_pt_conversion_pts?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          fumble_lost_points?: number
          id?: string
          interception_points?: number
          is_active?: boolean
          name?: string
          pass_td_points?: number
          pass_yds_per_point?: number
          rec_td_points?: number
          rec_yds_per_point?: number
          rush_td_points?: number
          rush_yds_per_point?: number
          two_pt_conversion_pts?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_picks: {
        Row: {
          created_at: string
          id: string
          league_id: string
          player_id: number
          player_name: string
          position: string
          position_slot: string
          season: number
          submitted_at: string
          team_id: number
          team_name: string
          updated_at: string
          user_id: string
          week: number
        }
        Insert: {
          created_at?: string
          id?: string
          league_id?: string
          player_id: number
          player_name: string
          position: string
          position_slot: string
          season?: number
          submitted_at?: string
          team_id: number
          team_name: string
          updated_at?: string
          user_id: string
          week: number
        }
        Update: {
          created_at?: string
          id?: string
          league_id?: string
          player_id?: number
          player_name?: string
          position?: string
          position_slot?: string
          season?: number
          submitted_at?: string
          team_id?: number
          team_name?: string
          updated_at?: string
          user_id?: string
          week?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
