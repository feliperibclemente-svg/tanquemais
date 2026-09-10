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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_insights: {
        Row: {
          body: string
          created_at: string
          dismissed: boolean
          id: string
          kind: string
          metadata: Json
          savings_estimate: number | null
          severity: string
          title: string
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          dismissed?: boolean
          id?: string
          kind?: string
          metadata?: Json
          savings_estimate?: number | null
          severity?: string
          title: string
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          dismissed?: boolean
          id?: string
          kind?: string
          metadata?: Json
          savings_estimate?: number | null
          severity?: string
          title?: string
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          description: string
          icon: string | null
          id: string
          name: string
          sort_order: number
          xp_reward: number
        }
        Insert: {
          description: string
          icon?: string | null
          id: string
          name: string
          sort_order?: number
          xp_reward?: number
        }
        Update: {
          description?: string
          icon?: string | null
          id?: string
          name?: string
          sort_order?: number
          xp_reward?: number
        }
        Relationships: []
      }
      club_members: {
        Row: {
          club_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_members_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          city: string | null
          cover_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          kind: string
          members_count: number
          name: string
          slug: string
        }
        Insert: {
          city?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          kind?: string
          members_count?: number
          name: string
          slug: string
        }
        Update: {
          city?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          kind?: string
          members_count?: number
          name?: string
          slug?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          station_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          station_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          station_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          app_version: string | null
          created_at: string
          id: string
          kind: string
          message: string
          page: string | null
          rating: number | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          app_version?: string | null
          created_at?: string
          id?: string
          kind?: string
          message: string
          page?: string | null
          rating?: number | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          app_version?: string | null
          created_at?: string
          id?: string
          kind?: string
          message?: string
          page?: string | null
          rating?: number | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      followers: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      fuel_types: {
        Row: {
          id: string
          label: string
          sort_order: number
          unit: string
        }
        Insert: {
          id: string
          label: string
          sort_order?: number
          unit?: string
        }
        Update: {
          id?: string
          label?: string
          sort_order?: number
          unit?: string
        }
        Relationships: []
      }
      fuelings: {
        Row: {
          client_id: string | null
          cost_per_km: number | null
          created_at: string
          filled_at: string
          fuel_type_id: string
          full_tank: boolean
          id: string
          km_per_liter: number | null
          liters: number
          note: string | null
          odometer: number
          photo_url: string | null
          price_per_liter: number
          station_id: string | null
          synced_at: string
          total_cost: number
          updated_at: string
          user_id: string
          vehicle_id: string
        }
        Insert: {
          client_id?: string | null
          cost_per_km?: number | null
          created_at?: string
          filled_at?: string
          fuel_type_id: string
          full_tank?: boolean
          id?: string
          km_per_liter?: number | null
          liters: number
          note?: string | null
          odometer: number
          photo_url?: string | null
          price_per_liter: number
          station_id?: string | null
          synced_at?: string
          total_cost: number
          updated_at?: string
          user_id: string
          vehicle_id: string
        }
        Update: {
          client_id?: string | null
          cost_per_km?: number | null
          created_at?: string
          filled_at?: string
          fuel_type_id?: string
          full_tank?: boolean
          id?: string
          km_per_liter?: number | null
          liters?: number
          note?: string | null
          odometer?: number
          photo_url?: string | null
          price_per_liter?: number
          station_id?: string | null
          synced_at?: string
          total_cost?: number
          updated_at?: string
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fuelings_fuel_type_id_fkey"
            columns: ["fuel_type_id"]
            isOneToOne: false
            referencedRelation: "fuel_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuelings_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuelings_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_progress: {
        Row: {
          completed_at: string | null
          id: string
          mission_id: string
          period_start: string
          progress: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          mission_id: string
          period_start?: string
          progress?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          mission_id?: string
          period_start?: string
          progress?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_progress_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      missions: {
        Row: {
          active: boolean
          description: string
          goal: number
          id: string
          period: string
          title: string
          unit: string
          xp_reward: number
        }
        Insert: {
          active?: boolean
          description: string
          goal: number
          id: string
          period?: string
          title: string
          unit?: string
          xp_reward?: number
        }
        Update: {
          active?: boolean
          description?: string
          goal?: number
          id?: string
          period?: string
          title?: string
          unit?: string
          xp_reward?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          audience: string
          club_id: string | null
          comments_count: number
          content: string | null
          created_at: string
          fueling_id: string | null
          id: string
          kind: string
          likes_count: number
          metadata: Json
          photo_url: string | null
          station_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          audience?: string
          club_id?: string | null
          comments_count?: number
          content?: string | null
          created_at?: string
          fueling_id?: string | null
          id?: string
          kind?: string
          likes_count?: number
          metadata?: Json
          photo_url?: string | null
          station_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          audience?: string
          club_id?: string | null
          comments_count?: number
          content?: string | null
          created_at?: string
          fueling_id?: string | null
          id?: string
          kind?: string
          likes_count?: number
          metadata?: Json
          photo_url?: string | null
          station_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_fueling_id_fkey"
            columns: ["fueling_id"]
            isOneToOne: false
            referencedRelation: "fuelings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      price_history: {
        Row: {
          created_at: string
          fuel_type_id: string
          id: string
          price: number
          reported_by: string | null
          station_id: string
        }
        Insert: {
          created_at?: string
          fuel_type_id: string
          id?: string
          price: number
          reported_by?: string | null
          station_id: string
        }
        Update: {
          created_at?: string
          fuel_type_id?: string
          id?: string
          price?: number
          reported_by?: string | null
          station_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_history_fuel_type_id_fkey"
            columns: ["fuel_type_id"]
            isOneToOne: false
            referencedRelation: "fuel_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_history_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string
          full_name: string | null
          hide_odometer: boolean
          id: string
          level: number
          onboarded: boolean
          state: string | null
          updated_at: string
          username: string | null
          visibility: string
          xp: number
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          full_name?: string | null
          hide_odometer?: boolean
          id: string
          level?: number
          onboarded?: boolean
          state?: string | null
          updated_at?: string
          username?: string | null
          visibility?: string
          xp?: number
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          full_name?: string | null
          hide_odometer?: boolean
          id?: string
          level?: number
          onboarded?: boolean
          state?: string | null
          updated_at?: string
          username?: string | null
          visibility?: string
          xp?: number
        }
        Relationships: []
      }
      station_photos: {
        Row: {
          created_at: string
          id: string
          photo_url: string
          station_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          photo_url: string
          station_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          photo_url?: string
          station_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "station_photos_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      station_prices: {
        Row: {
          confirmations: number
          fuel_type_id: string
          id: string
          price: number
          reported_at: string
          reported_by: string | null
          station_id: string
          updated_at: string
        }
        Insert: {
          confirmations?: number
          fuel_type_id: string
          id?: string
          price: number
          reported_at?: string
          reported_by?: string | null
          station_id: string
          updated_at?: string
        }
        Update: {
          confirmations?: number
          fuel_type_id?: string
          id?: string
          price?: number
          reported_at?: string
          reported_by?: string | null
          station_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "station_prices_fuel_type_id_fkey"
            columns: ["fuel_type_id"]
            isOneToOne: false
            referencedRelation: "fuel_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "station_prices_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      station_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: number
          station_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          station_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          station_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "station_reviews_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      stations: {
        Row: {
          address: string | null
          brand: string | null
          city: string | null
          created_at: string
          created_by: string | null
          fillups_count: number
          has_convenience: boolean
          id: string
          is_24h: boolean
          latitude: number | null
          longitude: number | null
          name: string
          rating: number
          reliability_score: number
          reviews_count: number
          state: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          brand?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          fillups_count?: number
          has_convenience?: boolean
          id?: string
          is_24h?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          rating?: number
          reliability_score?: number
          reviews_count?: number
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          brand?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          fillups_count?: number
          has_convenience?: boolean
          id?: string
          is_24h?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          rating?: number
          reliability_score?: number
          reviews_count?: number
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_statistics: {
        Row: {
          accumulated_savings: number
          avg_km_per_liter: number | null
          contributions: number
          total_fuelings: number
          total_km: number
          total_liters: number
          total_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          accumulated_savings?: number
          avg_km_per_liter?: number | null
          contributions?: number
          total_fuelings?: number
          total_km?: number
          total_liters?: number
          total_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          accumulated_savings?: number
          avg_km_per_liter?: number | null
          contributions?: number
          total_fuelings?: number
          total_km?: number
          total_liters?: number
          total_spent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vehicle_statistics: {
        Row: {
          avg_autonomy_km: number | null
          avg_km_per_liter: number | null
          avg_price_per_liter: number | null
          best_km_per_liter: number | null
          cost_per_km: number | null
          total_fuelings: number
          total_km: number
          total_liters: number
          total_spent: number
          updated_at: string
          user_id: string
          vehicle_id: string
          worst_km_per_liter: number | null
        }
        Insert: {
          avg_autonomy_km?: number | null
          avg_km_per_liter?: number | null
          avg_price_per_liter?: number | null
          best_km_per_liter?: number | null
          cost_per_km?: number | null
          total_fuelings?: number
          total_km?: number
          total_liters?: number
          total_spent?: number
          updated_at?: string
          user_id: string
          vehicle_id: string
          worst_km_per_liter?: number | null
        }
        Update: {
          avg_autonomy_km?: number | null
          avg_km_per_liter?: number | null
          avg_price_per_liter?: number | null
          best_km_per_liter?: number | null
          cost_per_km?: number | null
          total_fuelings?: number
          total_km?: number
          total_liters?: number
          total_spent?: number
          updated_at?: string
          user_id?: string
          vehicle_id?: string
          worst_km_per_liter?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_statistics_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: true
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          brand: string
          color: string | null
          created_at: string
          current_odometer: number
          engine: string | null
          fuel_type_id: string | null
          id: string
          initial_odometer: number
          is_primary: boolean
          model: string
          nickname: string | null
          photo_url: string | null
          plate: string | null
          tank_liters: number | null
          updated_at: string
          user_id: string
          year: number | null
        }
        Insert: {
          brand: string
          color?: string | null
          created_at?: string
          current_odometer?: number
          engine?: string | null
          fuel_type_id?: string | null
          id?: string
          initial_odometer?: number
          is_primary?: boolean
          model: string
          nickname?: string | null
          photo_url?: string | null
          plate?: string | null
          tank_liters?: number | null
          updated_at?: string
          user_id: string
          year?: number | null
        }
        Update: {
          brand?: string
          color?: string | null
          created_at?: string
          current_odometer?: number
          engine?: string | null
          fuel_type_id?: string | null
          id?: string
          initial_odometer?: number
          is_primary?: boolean
          model?: string
          nickname?: string | null
          photo_url?: string | null
          plate?: string | null
          tank_liters?: number | null
          updated_at?: string
          user_id?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_fuel_type_id_fkey"
            columns: ["fuel_type_id"]
            isOneToOne: false
            referencedRelation: "fuel_types"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_club_member: {
        Args: { _club_id: string; _user_id: string }
        Returns: boolean
      }
      is_following: {
        Args: { _follower: string; _following: string }
        Returns: boolean
      }
      recalc_statistics: {
        Args: { _user_id: string; _vehicle_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
