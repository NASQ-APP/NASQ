/**
 * أنواع مولَّدة من مخطط القاعدة — لا تُحرَّر يدويًا.
 *
 * التوليد: `npm run db:types` من جذر المشروع.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      agent_threads: {
        Row: {
          created_at: string
          id: string
          messages: Json
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          messages?: Json
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          gender: Database['public']['Enums']['gender']
          group: string
          id: string
          name: string
          name_latin: string
          slot: Database['public']['Enums']['body_slot']
          sort_order: number
        }
        Insert: {
          gender: Database['public']['Enums']['gender']
          group: string
          id: string
          name: string
          name_latin: string
          slot: Database['public']['Enums']['body_slot']
          sort_order?: number
        }
        Update: {
          gender?: Database['public']['Enums']['gender']
          group?: string
          id?: string
          name?: string
          name_latin?: string
          slot?: Database['public']['Enums']['body_slot']
          sort_order?: number
        }
        Relationships: []
      }
      closets: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          name_latin: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          name_latin?: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          name_latin?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      inspirations: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          note: string | null
          palette: Json
          pieces: Json
          source: string
          source_link: string | null
          tags: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          note?: string | null
          palette?: Json
          pieces?: Json
          source: string
          source_link?: string | null
          tags?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          note?: string | null
          palette?: Json
          pieces?: Json
          source?: string
          source_link?: string | null
          tags?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      item_closets: {
        Row: { closet_id: string; item_id: string }
        Insert: { closet_id: string; item_id: string }
        Update: { closet_id?: string; item_id?: string }
        Relationships: [
          {
            foreignKeyName: 'item_closets_closet_id_fkey'
            columns: ['closet_id']
            isOneToOne: false
            referencedRelation: 'closets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'item_closets_item_id_fkey'
            columns: ['item_id']
            isOneToOne: false
            referencedRelation: 'items'
            referencedColumns: ['id']
          },
        ]
      }
      item_embeddings: {
        Row: { created_at: string; embedding: string | null; item_id: string }
        Insert: { created_at?: string; embedding?: string | null; item_id: string }
        Update: { created_at?: string; embedding?: string | null; item_id?: string }
        Relationships: [
          {
            foreignKeyName: 'item_embeddings_item_id_fkey'
            columns: ['item_id']
            isOneToOne: true
            referencedRelation: 'items'
            referencedColumns: ['id']
          },
        ]
      }
      items: {
        Row: {
          ai_meta: Json
          brand: string | null
          category_id: string
          color_hex: string
          color_name: string
          color_secondary: string | null
          created_at: string
          fit: string | null
          garment_template: string | null
          id: string
          image_chosen_by_user: boolean
          image_cutout_url: string | null
          image_has_model: boolean
          image_url: string | null
          images: string[]
          is_favorite: boolean
          last_worn_at: string | null
          length: string | null
          material: string | null
          name: string
          name_latin: string | null
          notes: string | null
          occasions: string[]
          pattern: string | null
          photo_path: string | null
          price: number | null
          price_label: string | null
          purchase_date: string | null
          seasons: string[]
          shape: string
          size: string | null
          source: Database['public']['Enums']['item_source']
          source_link: string | null
          store_id: string | null
          tags: string[]
          updated_at: string
          user_id: string
          wear_count: number
        }
        Insert: {
          ai_meta?: Json
          brand?: string | null
          category_id: string
          color_hex: string
          color_name: string
          color_secondary?: string | null
          created_at?: string
          fit?: string | null
          garment_template?: string | null
          id?: string
          image_chosen_by_user?: boolean
          image_cutout_url?: string | null
          image_has_model?: boolean
          image_url?: string | null
          images?: string[]
          is_favorite?: boolean
          last_worn_at?: string | null
          length?: string | null
          material?: string | null
          name: string
          name_latin?: string | null
          notes?: string | null
          occasions?: string[]
          pattern?: string | null
          photo_path?: string | null
          price?: number | null
          price_label?: string | null
          purchase_date?: string | null
          seasons?: string[]
          shape: string
          size?: string | null
          source?: Database['public']['Enums']['item_source']
          source_link?: string | null
          store_id?: string | null
          tags?: string[]
          updated_at?: string
          user_id: string
          wear_count?: number
        }
        Update: Partial<Database['public']['Tables']['items']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'items_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
        ]
      }
      models: {
        Row: {
          age_group: string | null
          body_shape: string | null
          created_at: string
          gender: Database['public']['Enums']['gender']
          hair_color: string | null
          hair_style: string | null
          height_cm: number | null
          id: string
          is_default: boolean
          measurements: Json
          name: string
          preview_image_url: string | null
          refinement: string | null
          seed: number
          skin_tone: string | null
          updated_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          age_group?: string | null
          body_shape?: string | null
          created_at?: string
          gender: Database['public']['Enums']['gender']
          hair_color?: string | null
          hair_style?: string | null
          height_cm?: number | null
          id?: string
          is_default?: boolean
          measurements?: Json
          name: string
          preview_image_url?: string | null
          refinement?: string | null
          seed: number
          skin_tone?: string | null
          updated_at?: string
          user_id: string
          weight_kg?: number | null
        }
        Update: Partial<Database['public']['Tables']['models']['Insert']>
        Relationships: []
      }
      outfit_closets: {
        Row: { closet_id: string; outfit_id: string }
        Insert: { closet_id: string; outfit_id: string }
        Update: { closet_id?: string; outfit_id?: string }
        Relationships: [
          {
            foreignKeyName: 'outfit_closets_closet_id_fkey'
            columns: ['closet_id']
            isOneToOne: false
            referencedRelation: 'closets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'outfit_closets_outfit_id_fkey'
            columns: ['outfit_id']
            isOneToOne: false
            referencedRelation: 'outfits'
            referencedColumns: ['id']
          },
        ]
      }
      outfit_items: {
        Row: {
          id: string
          item_id: string | null
          layer: Database['public']['Enums']['body_slot']
          outfit_id: string
          position: number
        }
        Insert: {
          id?: string
          item_id?: string | null
          layer: Database['public']['Enums']['body_slot']
          outfit_id: string
          position?: number
        }
        Update: Partial<Database['public']['Tables']['outfit_items']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'outfit_items_item_id_fkey'
            columns: ['item_id']
            isOneToOne: false
            referencedRelation: 'items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'outfit_items_outfit_id_fkey'
            columns: ['outfit_id']
            isOneToOne: false
            referencedRelation: 'outfits'
            referencedColumns: ['id']
          },
        ]
      }
      outfits: {
        Row: {
          created_at: string
          framing: Database['public']['Enums']['framing']
          id: string
          is_simulated: boolean
          last_worn_at: string | null
          model_id: string | null
          name: string
          notes: string | null
          number: number | null
          occasion: string | null
          result_image_url: string | null
          seasons: string[]
          tags: string[]
          updated_at: string
          user_id: string
          wear_count: number
        }
        Insert: {
          created_at?: string
          framing?: Database['public']['Enums']['framing']
          id?: string
          is_simulated?: boolean
          last_worn_at?: string | null
          model_id?: string | null
          name: string
          notes?: string | null
          number?: number | null
          occasion?: string | null
          result_image_url?: string | null
          seasons?: string[]
          tags?: string[]
          updated_at?: string
          user_id: string
          wear_count?: number
        }
        Update: Partial<Database['public']['Tables']['outfits']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'outfits_model_id_fkey'
            columns: ['model_id']
            isOneToOne: false
            referencedRelation: 'models'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          city: string | null
          created_at: string
          declared_style: Json
          gender: Database['public']['Enums']['gender']
          id: string
          locale: string
          name: string | null
          theme: string
          units: string
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          declared_style?: Json
          gender?: Database['public']['Enums']['gender']
          id: string
          locale?: string
          name?: string | null
          theme?: string
          units?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
        Relationships: []
      }
      render_jobs: {
        Row: {
          created_at: string
          error_code: string | null
          error_message: string | null
          id: string
          outfit_id: string | null
          prompt: Json
          provider: string
          request_hash: string
          result_url: string | null
          stage: string | null
          status: Database['public']['Enums']['render_status']
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          outfit_id?: string | null
          prompt: Json
          provider: string
          request_hash: string
          result_url?: string | null
          stage?: string | null
          status?: Database['public']['Enums']['render_status']
          updated_at?: string
          user_id: string
        }
        Update: Partial<Database['public']['Tables']['render_jobs']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'render_jobs_outfit_id_fkey'
            columns: ['outfit_id']
            isOneToOne: false
            referencedRelation: 'outfits'
            referencedColumns: ['id']
          },
        ]
      }
      shares: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          outfit_id: string
          show_brands: boolean
          show_prices: boolean
          token: string
          user_id: string
          view_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          outfit_id: string
          show_brands?: boolean
          show_prices?: boolean
          token?: string
          user_id: string
          view_count?: number
        }
        Update: Partial<Database['public']['Tables']['shares']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'shares_outfit_id_fkey'
            columns: ['outfit_id']
            isOneToOne: false
            referencedRelation: 'outfits'
            referencedColumns: ['id']
          },
        ]
      }
      trip_day_items: {
        Row: { item_id: string; trip_day_id: string }
        Insert: { item_id: string; trip_day_id: string }
        Update: { item_id?: string; trip_day_id?: string }
        Relationships: [
          {
            foreignKeyName: 'trip_day_items_item_id_fkey'
            columns: ['item_id']
            isOneToOne: false
            referencedRelation: 'items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'trip_day_items_trip_day_id_fkey'
            columns: ['trip_day_id']
            isOneToOne: false
            referencedRelation: 'trip_days'
            referencedColumns: ['id']
          },
        ]
      }
      trip_days: {
        Row: { day: number; id: string; label: string | null; trip_id: string }
        Insert: { day: number; id?: string; label?: string | null; trip_id: string }
        Update: { day?: number; id?: string; label?: string | null; trip_id?: string }
        Relationships: [
          {
            foreignKeyName: 'trip_days_trip_id_fkey'
            columns: ['trip_id']
            isOneToOne: false
            referencedRelation: 'trips'
            referencedColumns: ['id']
          },
        ]
      }
      trip_packed: {
        Row: { item_id: string; trip_id: string }
        Insert: { item_id: string; trip_id: string }
        Update: { item_id?: string; trip_id?: string }
        Relationships: [
          {
            foreignKeyName: 'trip_packed_item_id_fkey'
            columns: ['item_id']
            isOneToOne: false
            referencedRelation: 'items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'trip_packed_trip_id_fkey'
            columns: ['trip_id']
            isOneToOne: false
            referencedRelation: 'trips'
            referencedColumns: ['id']
          },
        ]
      }
      trips: {
        Row: {
          city: string
          city_latin: string
          created_at: string
          date_from: string
          date_to: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          city: string
          city_latin?: string
          created_at?: string
          date_from: string
          date_to: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: Partial<Database['public']['Tables']['trips']['Insert']>
        Relationships: []
      }
    }
    Views: Record<never, never>
    Functions: {
      owns_closet: { Args: { target: string }; Returns: boolean }
      owns_item: { Args: { target: string }; Returns: boolean }
      owns_model: { Args: { target: string }; Returns: boolean }
      owns_outfit: { Args: { target: string }; Returns: boolean }
      owns_trip: { Args: { target: string }; Returns: boolean }
      render_jobs_today: { Args: { target_user: string }; Returns: number }
      search_items: {
        Args: { match_count?: number; query_embedding: string }
        Returns: { item_id: string; similarity: number }[]
      }
      shared_outfit: { Args: { share_token: string }; Returns: Json }
    }
    Enums: {
      body_slot: 'top' | 'bottom' | 'full' | 'outer' | 'shoes' | 'bag' | 'accessory'
      framing: 'full' | 'upper' | 'lower' | 'detail'
      gender: 'male' | 'female'
      item_source: 'wardrobe' | 'try'
      render_status:
        | 'idle'
        | 'uploading'
        | 'validating'
        | 'processing'
        | 'generating'
        | 'completed'
        | 'failed'
    }
    CompositeTypes: Record<never, never>
  }
}

type PublicSchema = Database['public']

export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row']
export type TablesInsert<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Update']
export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T]
