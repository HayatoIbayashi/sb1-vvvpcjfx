export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          display_name: string | null
          gender: string | null
          age: number | null
          prefecture: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          display_name?: string | null
          gender?: string | null
          age?: number | null
          prefecture?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          display_name?: string | null
          gender?: string | null
          age?: number | null
          prefecture?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      movies: {
        Row: {
          id: string
          title: string
          description: string | null
          thumbnail: string | null
          thumbnail_top: string | null
          thumbnail_detail: string | null
          release_date: string | null
          duration: string | null
          genre: string[] | null
          cast: string[] | null
          director: string | null
          release_year: number | null
          created_at: string
          updated_at: string
          price: number
          rental_price: number
          access_mode: 'public' | 'purchase_only' | 'subscription_only' | 'subscription_or_purchase'
          buy_price: number
          currency: string
          stripe_price_id_one_time: string | null
          is_published: boolean
          is_home_feature: boolean
          home_featured_order: number | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          thumbnail?: string | null
          thumbnail_top: string | null
          thumbnail_detail: string | null
          release_date?: string | null
          duration?: string | null
          genre?: string[] | null
          cast?: string[] | null
          director?: string | null
          release_year?: number | null
          created_at?: string
          updated_at?: string
          price: number
          rental_price: number
          access_mode?: 'public' | 'purchase_only' | 'subscription_only' | 'subscription_or_purchase'
          buy_price?: number
          currency?: string
          stripe_price_id_one_time?: string | null
          is_published?: boolean
          is_home_feature?: boolean
          home_featured_order?: number | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          thumbnail?: string | null
          thumbnail_top?: string | null
          thumbnail_detail?: string | null
          release_date?: string | null
          duration?: string | null
          genre?: string[] | null
          cast?: string[] | null
          director?: string | null
          release_year?: number | null
          created_at?: string
          updated_at?: string
          price?: number
          rental_price?: number
          access_mode?: 'public' | 'purchase_only' | 'subscription_only' | 'subscription_or_purchase'
          buy_price?: number
          currency?: string
          stripe_price_id_one_time?: string | null
          is_published?: boolean
          is_home_feature?: boolean
          home_featured_order?: number | null
        }
      }
      movie_stripe_prices: {
        Row: {
          id: string
          movie_id: string
          stripe_product_id: string
          stripe_price_id: string
          unit_amount: number
          currency: string
          price_type: string
          active: boolean
          is_current: boolean
          stripe_created_at: string | null
          synced_at: string
          archived_at: string | null
          archived_reason: string | null
          restored_at: string | null
          restored_from_stripe_price_id: string | null
          superseded_by_stripe_price_id: string | null
          raw_stripe_price: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          movie_id: string
          stripe_product_id: string
          stripe_price_id: string
          unit_amount: number
          currency: string
          price_type?: string
          active?: boolean
          is_current?: boolean
          stripe_created_at?: string | null
          synced_at?: string
          archived_at?: string | null
          archived_reason?: string | null
          restored_at?: string | null
          restored_from_stripe_price_id?: string | null
          superseded_by_stripe_price_id?: string | null
          raw_stripe_price?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          movie_id?: string
          stripe_product_id?: string
          stripe_price_id?: string
          unit_amount?: number
          currency?: string
          price_type?: string
          active?: boolean
          is_current?: boolean
          stripe_created_at?: string | null
          synced_at?: string
          archived_at?: string | null
          archived_reason?: string | null
          restored_at?: string | null
          restored_from_stripe_price_id?: string | null
          superseded_by_stripe_price_id?: string | null
          raw_stripe_price?: Json
          created_at?: string
          updated_at?: string
        }
      }
      purchases: {
        Row: {
          id: string
          user_id: string
          movie_id: string
          status: 'pending' | 'completed' | 'failed' | 'canceled'
          amount_total: number
          currency: string
          payment_method: string | null
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          purchased_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          movie_id: string
          status?: 'pending' | 'completed' | 'failed' | 'canceled'
          amount_total?: number
          currency?: string
          payment_method?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          purchased_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          movie_id?: string
          status?: 'pending' | 'completed' | 'failed' | 'canceled'
          amount_total?: number
          currency?: string
          payment_method?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          purchased_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      watchlist: {
        Row: {
          id: string
          user_id: string
          movie_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          movie_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          movie_id?: string
          created_at?: string
        }
      }
      watch_history: {
        Row: {
          id: string
          user_id: string
          movie_id: string
          watched_at: string
          resume_position_sec: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          movie_id: string
          watched_at?: string
          resume_position_sec?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          movie_id?: string
          watched_at?: string
          resume_position_sec?: number
          created_at?: string
          updated_at?: string
        }
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
  }
}
