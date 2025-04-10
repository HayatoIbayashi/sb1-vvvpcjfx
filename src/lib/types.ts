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
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
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
          release_date: string | null
          duration: string | null
          rating: number | null
          genre: string[] | null
          cast: string[] | null
          director: string | null
          release_year: number | null
          created_at: string
          updated_at: string
          price: number
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          thumbnail?: string | null
          release_date?: string | null
          duration?: string | null
          rating?: number | null
          genre?: string[] | null
          cast?: string[] | null
          director?: string | null
          release_year?: number | null
          created_at?: string
          updated_at?: string
          price: number
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          thumbnail?: string | null
          release_date?: string | null
          duration?: string | null
          rating?: number | null
          genre?: string[] | null
          cast?: string[] | null
          director?: string | null
          release_year?: number | null
          created_at?: string
          updated_at?: string
          price?: number
        }
      }
      purchases: {
        Row: {
          id: string
          user_id: string
          movie_id: string
          created_at: string
          payment_intent_id: string
          status: 'pending' | 'completed' | 'failed'
        }
        Insert: {
          id?: string
          user_id: string
          movie_id: string
          created_at?: string
          payment_intent_id: string
          status?: 'pending' | 'completed' | 'failed'
        }
        Update: {
          id?: string
          user_id?: string
          movie_id?: string
          created_at?: string
          payment_intent_id?: string
          status?: 'pending' | 'completed' | 'failed'
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