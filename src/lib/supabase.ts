import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          goal: string
          goal_due_date: string | null
          height_cm: number | null
          weight_kg: number | null
          age: number | null
          sex: string | null
          activity_level: string | null
          diet_preferences: string[] | null
          workout_preferences: string[] | null
          daily_calorie_target: number | null
          daily_protein_target: number | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Row']>
      }
      food_logs: {
        Row: {
          id: string
          user_id: string
          log_date: string
          meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
          food_name: string
          quantity_g: number | null
          calories: number
          protein_g: number | null
          carbs_g: number | null
          fat_g: number | null
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['food_logs']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['food_logs']['Row']>
      }
      workout_logs: {
        Row: {
          id: string
          user_id: string
          log_date: string
          workout_type: string
          duration_minutes: number
          calories_burned: number | null
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['workout_logs']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['workout_logs']['Row']>
      }
      weight_logs: {
        Row: {
          id: string
          user_id: string
          log_date: string
          weight_kg: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['weight_logs']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['weight_logs']['Row']>
      }
    }
  }
}
