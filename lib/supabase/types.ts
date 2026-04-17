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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ai_responses: {
        Row: {
          action: string | null
          auto_title: string | null
          context_snapshot: string | null
          created_at: string
          deleted_at: string | null
          id: string
          linked_entities: Json
          model: string | null
          project_id: string
          prompt: string
          response: string
          source_label: string | null
          source_node_id: string | null
          source_scene_id: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          action?: string | null
          auto_title?: string | null
          context_snapshot?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          linked_entities?: Json
          model?: string | null
          project_id: string
          prompt: string
          response: string
          source_label?: string | null
          source_node_id?: string | null
          source_scene_id?: string | null
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          action?: string | null
          auto_title?: string | null
          context_snapshot?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          linked_entities?: Json
          model?: string | null
          project_id?: string
          prompt?: string
          response?: string
          source_label?: string | null
          source_node_id?: string | null
          source_scene_id?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_responses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_responses_source_node_id_fkey"
            columns: ["source_node_id"]
            isOneToOne: false
            referencedRelation: "structure_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_responses_source_scene_id_fkey"
            columns: ["source_scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      characters: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          description: string | null
          id: string
          name: string
          notes: string | null
          order_index: number
          project_id: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
          notes?: string | null
          order_index?: number
          project_id: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
          notes?: string | null
          order_index?: number
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "characters_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_assets: {
        Row: {
          asset_id: string
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          is_primary: boolean | null
          project_id: string
        }
        Insert: {
          asset_id: string
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          is_primary?: boolean | null
          project_id: string
        }
        Update: {
          asset_id?: string
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          is_primary?: boolean | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "project_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_relationships: {
        Row: {
          created_at: string | null
          id: string
          is_symmetrical: boolean | null
          project_id: string
          relation_label: string
          source_id: string
          source_type: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_symmetrical?: boolean | null
          project_id: string
          relation_label: string
          source_id: string
          source_type: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_symmetrical?: boolean | null
          project_id?: string
          relation_label?: string
          source_id?: string
          source_type?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_relationships_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ideas: {
        Row: {
          content: string | null
          created_at: string | null
          deleted_at: string | null
          id: string
          order_index: number
          project_id: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          order_index?: number
          project_id: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          order_index?: number
          project_id?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ideas_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          atmosphere: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          id: string
          name: string
          order_index: number
          project_id: string
          updated_at: string | null
        }
        Insert: {
          atmosphere?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
          order_index?: number
          project_id: string
          updated_at?: string | null
        }
        Update: {
          atmosphere?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
          order_index?: number
          project_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      objects: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          description: string | null
          id: string
          name: string
          order_index: number
          project_id: string
          significance: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
          order_index?: number
          project_id: string
          significance?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
          order_index?: number
          project_id?: string
          significance?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          id: string
          is_early_user: boolean | null
          plan_type: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id: string
          is_early_user?: boolean | null
          plan_type?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          is_early_user?: boolean | null
          plan_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      project_assets: {
        Row: {
          alt_text: string | null
          asset_type: string
          caption: string | null
          created_at: string | null
          file_name: string
          file_size: number
          height: number | null
          id: string
          mime_type: string
          project_id: string
          storage_path: string
          updated_at: string | null
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          asset_type?: string
          caption?: string | null
          created_at?: string | null
          file_name: string
          file_size: number
          height?: number | null
          id?: string
          mime_type: string
          project_id: string
          storage_path: string
          updated_at?: string | null
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          asset_type?: string
          caption?: string | null
          created_at?: string | null
          file_name?: string
          file_size?: number
          height?: number | null
          id?: string
          mime_type?: string
          project_id?: string
          storage_path?: string
          updated_at?: string | null
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_comments: {
        Row: {
          anchor_data: Json | null
          author_id: string
          content: string
          created_at: string
          id: string
          node_id: string | null
          order_index: number | null
          parent_id: string | null
          project_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          anchor_data?: Json | null
          author_id?: string
          content: string
          created_at?: string
          id?: string
          node_id?: string | null
          order_index?: number | null
          parent_id?: string | null
          project_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          anchor_data?: Json | null
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          node_id?: string | null
          order_index?: number | null
          parent_id?: string | null
          project_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_comments_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "structure_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "project_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          created_at: string | null
          id: string
          project_id: string
          role: Database["public"]["Enums"]["project_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          project_id: string
          role?: Database["public"]["Enums"]["project_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          project_id?: string
          role?: Database["public"]["Enums"]["project_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey_profiles"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_snapshots: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          project_id: string
          snapshot_data: Json | null
          storage_path: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          project_id: string
          snapshot_data?: Json | null
          storage_path?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          project_id?: string
          snapshot_data?: Json | null
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          cover_url: string | null
          created_at: string | null
          deleted_at: string | null
          export_metadata: Json | null
          id: string
          last_accessed_at: string | null
          order_index: number | null
          premise: string | null
          project_type: string | null
          setting: string | null
          title: string | null
          tone: string | null
          type: string
          updated_at: string | null
          user_id: string
          writing_mode: string | null
        }
        Insert: {
          cover_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          export_metadata?: Json | null
          id?: string
          last_accessed_at?: string | null
          order_index?: number | null
          premise?: string | null
          project_type?: string | null
          setting?: string | null
          title?: string | null
          tone?: string | null
          type: string
          updated_at?: string | null
          user_id: string
          writing_mode?: string | null
        }
        Update: {
          cover_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          export_metadata?: Json | null
          id?: string
          last_accessed_at?: string | null
          order_index?: number | null
          premise?: string | null
          project_type?: string | null
          setting?: string | null
          title?: string | null
          tone?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
          writing_mode?: string | null
        }
        Relationships: []
      }
      scene_assets: {
        Row: {
          asset_id: string
          created_at: string | null
          id: string
          project_id: string
          scene_id: string
          sort_order: number | null
        }
        Insert: {
          asset_id: string
          created_at?: string | null
          id?: string
          project_id: string
          scene_id: string
          sort_order?: number | null
        }
        Update: {
          asset_id?: string
          created_at?: string | null
          id?: string
          project_id?: string
          scene_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scene_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "project_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scene_assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scene_assets_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      scene_characters: {
        Row: {
          character_id: string
          created_at: string | null
          scene_id: string
        }
        Insert: {
          character_id: string
          created_at?: string | null
          scene_id: string
        }
        Update: {
          character_id?: string
          created_at?: string | null
          scene_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scene_characters_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scene_characters_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      scene_ideas: {
        Row: {
          created_at: string | null
          idea_id: string
          scene_id: string
        }
        Insert: {
          created_at?: string | null
          idea_id: string
          scene_id: string
        }
        Update: {
          created_at?: string | null
          idea_id?: string
          scene_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scene_ideas_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scene_ideas_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      scene_locations: {
        Row: {
          created_at: string | null
          id: string
          location_id: string
          scene_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          location_id: string
          scene_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          location_id?: string
          scene_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scene_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scene_locations_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      scene_objects: {
        Row: {
          created_at: string | null
          id: string
          object_id: string
          scene_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          object_id: string
          scene_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          object_id?: string
          scene_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scene_objects_object_id_fkey"
            columns: ["object_id"]
            isOneToOne: false
            referencedRelation: "objects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scene_objects_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      scene_versions: {
        Row: {
          content: Json
          created_at: string | null
          id: string
          project_id: string
          scene_id: string
          source_text: string | null
        }
        Insert: {
          content: Json
          created_at?: string | null
          id?: string
          project_id: string
          scene_id: string
          source_text?: string | null
        }
        Update: {
          content?: Json
          created_at?: string | null
          id?: string
          project_id?: string
          scene_id?: string
          source_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scene_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scene_versions_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      scenes: {
        Row: {
          content: Json | null
          deleted_at: string | null
          id: string
          last_editor_id: string | null
          node_id: string
          project_id: string
          updated_at: string | null
          version: number
          writing_mode: string
        }
        Insert: {
          content?: Json | null
          deleted_at?: string | null
          id?: string
          last_editor_id?: string | null
          node_id: string
          project_id: string
          updated_at?: string | null
          version?: number
          writing_mode?: string
        }
        Update: {
          content?: Json | null
          deleted_at?: string | null
          id?: string
          last_editor_id?: string | null
          node_id?: string
          project_id?: string
          updated_at?: string | null
          version?: number
          writing_mode?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenes_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: true
            referencedRelation: "structure_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      story_units: {
        Row: {
          content: string | null
          id: string
          parent_id: string | null
          project_id: string | null
          title: string | null
          unit_order: number | null
          unit_type: string | null
        }
        Insert: {
          content?: string | null
          id?: string
          parent_id?: string | null
          project_id?: string | null
          title?: string | null
          unit_order?: number | null
          unit_type?: string | null
        }
        Update: {
          content?: string | null
          id?: string
          parent_id?: string | null
          project_id?: string | null
          title?: string | null
          unit_order?: number | null
          unit_type?: string | null
        }
        Relationships: []
      }
      structure_nodes: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          id: string
          order_index: number
          parent_id: string | null
          project_id: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          order_index?: number
          parent_id?: string | null
          project_id: string
          title?: string
          type: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          order_index?: number
          parent_id?: string | null
          project_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "structure_nodes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "structure_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "structure_nodes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_api_keys: {
        Row: {
          ai_enabled: boolean | null
          ai_fallback_enabled: boolean | null
          ai_provider: string | null
          api_key: string | null
          created_at: string | null
          id: string
          ollama_model: string | null
          ollama_url: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_enabled?: boolean | null
          ai_fallback_enabled?: boolean | null
          ai_provider?: string | null
          api_key?: string | null
          created_at?: string | null
          id?: string
          ollama_model?: string | null
          ollama_url?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_enabled?: boolean | null
          ai_fallback_enabled?: boolean | null
          ai_provider?: string | null
          api_key?: string | null
          created_at?: string | null
          id?: string
          ollama_model?: string | null
          ollama_url?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_project_member_by_email: {
        Args: {
          p_email: string
          p_id: string
          p_role: Database["public"]["Enums"]["project_role"]
        }
        Returns: undefined
      }
      can_edit_project: { Args: { p_id: string }; Returns: boolean }
      delete_user: { Args: never; Returns: undefined }
      get_comment_details: {
        Args: { comment_id_arg: string }
        Returns: {
          anchor_data: Json
          author_email: string
          author_id: string
          content: string
          created_at: string
          id: string
          node_id: string
          order_index: number
          parent_id: string
          project_id: string
          resolved_at: string
          resolved_by: string
          status: string
          updated_at: string
        }[]
      }
      get_my_project_role: {
        Args: { p_id: string }
        Returns: Database["public"]["Enums"]["project_role"]
      }
      get_project_comments_extended: {
        Args: { project_id_arg: string }
        Returns: {
          anchor_data: Json
          author_email: string
          author_id: string
          content: string
          created_at: string
          id: string
          node_id: string
          order_index: number
          parent_id: string
          project_id: string
          resolved_at: string
          resolved_by: string
          status: string
          updated_at: string
        }[]
      }
      get_project_member_email: {
        Args: { p_project_id: string; p_user_id: string }
        Returns: string
      }
      get_project_members_extended: {
        Args: { project_id_arg: string }
        Returns: {
          created_at: string
          email: string
          id: string
          role: string
          user_id: string
        }[]
      }
      is_thread_author: {
        Args: { parent_id_arg: string; user_id_arg: string }
        Returns: boolean
      }
      remove_project_member: {
        Args: { p_id: string; p_user_id: string }
        Returns: undefined
      }
      touch_project: { Args: { p_id: string }; Returns: undefined }
      update_project_member_role: {
        Args: {
          p_id: string
          p_role: Database["public"]["Enums"]["project_role"]
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      project_role: "owner" | "editor" | "viewer"
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
      project_role: ["owner", "editor", "viewer"],
    },
  },
} as const
