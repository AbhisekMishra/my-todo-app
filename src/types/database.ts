export interface Database {
  public: {
    Tables: {
      todos: {
        Row: {
          id: string
          title: string
          description: string | null
          due_date: string
          due_time: string | null
          category: 'normal' | 'reminder' | 'custom'
          severity: 'low' | 'medium' | 'high' | 'critical'
          completed: boolean
          image_url: string | null
          voice_note_url: string | null
          google_calendar_event_id: string | null
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          due_date?: string
          due_time?: string | null
          category?: 'normal' | 'reminder' | 'custom'
          severity?: 'low' | 'medium' | 'high' | 'critical'
          completed?: boolean
          image_url?: string | null
          voice_note_url?: string | null
          google_calendar_event_id?: string | null
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          due_date?: string
          due_time?: string | null
          category?: 'normal' | 'reminder' | 'custom'
          severity?: 'low' | 'medium' | 'high' | 'critical'
          completed?: boolean
          image_url?: string | null
          voice_note_url?: string | null
          google_calendar_event_id?: string | null
          user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      todo_agents: {
        Row: {
          id: string
          category: string
          name: string
          description: string
          prompt_template: string
          created_at: string
        }
        Insert: {
          id?: string
          category: string
          name: string
          description: string
          prompt_template: string
          created_at?: string
        }
        Update: {
          id?: string
          category?: string
          name?: string
          description?: string
          prompt_template?: string
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
      todo_category: 'normal' | 'reminder' | 'custom'
      todo_severity: 'low' | 'medium' | 'high' | 'critical'
    }
  }
}

export type Todo = Database['public']['Tables']['todos']['Row']
export type TodoInsert = Database['public']['Tables']['todos']['Insert']
export type TodoUpdate = Database['public']['Tables']['todos']['Update']
export type TodoAgent = Database['public']['Tables']['todo_agents']['Row']