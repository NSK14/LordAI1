export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      conversations: {
        Row: {
          created_at: string;
          favorite: boolean;
          folder_id: string | null;
          id: string;
          last_message_at: string;
          pinned: boolean;
          pinned_at: string | null;
          sort_order: number | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          client_tag?: string | null;
          favorite?: boolean;
          folder_id?: string | null;
          id?: string;
          last_message_at?: string;
          pinned?: boolean;
          pinned_at?: string | null;
          sort_order?: number | null;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          client_tag?: string | null;
          favorite?: boolean;
          folder_id?: string | null;
          id?: string;
          last_message_at?: string;
          pinned?: boolean;
          pinned_at?: string | null;
          sort_order?: number | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_folder_id_fkey";
            columns: ["folder_id"];
            isOneToOne: false;
            referencedRelation: "folders";
            referencedColumns: ["id"];
          },
        ];
      };
      conversation_shares: {
        Row: {
          id: string;
          conversation_id: string;
          share_token: string;
          created_by: string;
          created_at: string;
          expires_at: string | null;
          is_public: boolean;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          share_token?: string;
          created_by: string;
          created_at?: string;
          expires_at?: string | null;
          is_public?: boolean;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          share_token?: string;
          created_by?: string;
          created_at?: string;
          expires_at?: string | null;
          is_public?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_shares_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      folders: {
        Row: {
          color: string | null;
          created_at: string;
          icon: string | null;
          id: string;
          name: string;
          parent_id: string | null;
          sort_order: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          color?: string | null;
          created_at?: string;
          icon?: string | null;
          id?: string;
          name: string;
          parent_id?: string | null;
          sort_order?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          color?: string | null;
          created_at?: string;
          icon?: string | null;
          id?: string;
          name?: string;
          parent_id?: string | null;
          sort_order?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "folders_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "folders";
            referencedColumns: ["id"];
          },
        ];
      };
      memories: {
        Row: {
          category: string;
          client_tag: string | null;
          confidence: number;
          content: string;
          created_at: string;
          embedding: number[] | null;
          embedding_vec: string | null;
          id: string;
          pinned: boolean;
          source: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          category?: string;
          client_tag?: string | null;
          confidence?: number;
          content: string;
          created_at?: string;
          embedding?: number[] | null;
          embedding_vec?: string | null;
          id?: string;
          pinned?: boolean;
          source?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          category?: string;
          client_tag?: string | null;
          confidence?: number;
          content?: string;
          created_at?: string;
          embedding?: number[] | null;
          embedding_vec?: string | null;
          id?: string;
          pinned?: boolean;
          source?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      memory_settings: {
        Row: {
          user_id: string;
          memory_enabled: boolean;
          auto_save: boolean;
          ask_before_save: boolean;
          confidence_threshold: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          memory_enabled?: boolean;
          auto_save?: boolean;
          ask_before_save?: boolean;
          confidence_threshold?: number;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          memory_enabled?: boolean;
          auto_save?: boolean;
          ask_before_save?: boolean;
          confidence_threshold?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          client_tag: string | null;
          content: string;
          conversation_id: string;
          created_at: string;
          id: string;
          model: string | null;
          role: string;
          streaming: boolean;
          user_id: string;
        };
        Insert: {
          client_tag?: string | null;
          content: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          model?: string | null;
          role: string;
          streaming?: boolean;
          user_id: string;
        };
        Update: {
          client_tag?: string | null;
          content?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          model?: string | null;
          role?: string;
          streaming?: boolean;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string | null;
          id: string;
          last_active_at: string;
          name: string | null;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          id: string;
          last_active_at?: string;
          name?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          last_active_at?: string;
          name?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_settings: {
        Row: {
          auto_speak: boolean;
          created_at: string;
          default_mode: string;
          notifications_enabled: boolean;
          theme: string;
          updated_at: string;
          user_id: string;
          voice_rate: number;
        };
        Insert: {
          auto_speak?: boolean;
          created_at?: string;
          default_mode?: string;
          notifications_enabled?: boolean;
          theme?: string;
          updated_at?: string;
          user_id: string;
          voice_rate?: number;
        };
        Update: {
          auto_speak?: boolean;
          created_at?: string;
          default_mode?: string;
          notifications_enabled?: boolean;
          theme?: string;
          updated_at?: string;
          user_id?: string;
          voice_rate?: number;
        };
        Relationships: [];
      };
      learning_concepts: {
        Row: {
          id: string;
          standard_code: string;
          framework: string;
          subject: string;
          grade_band: string;
          title: string;
          description: string;
          prerequisites: string[];
          version: number;
          source_url: string | null;
          license: string;
          reviewed: boolean;
          chapter: string | null;
          misconception_tags: string[];
          created_at: string;
        };
        Insert: {
          id: string;
          standard_code: string;
          framework: string;
          subject: string;
          grade_band: string;
          title: string;
          description: string;
          prerequisites?: string[];
          version?: number;
          source_url?: string | null;
          license?: string;
          reviewed?: boolean;
          chapter?: string | null;
          misconception_tags?: string[];
        };
        Update: {
          id?: string;
          standard_code?: string;
          framework?: string;
          subject?: string;
          grade_band?: string;
          title?: string;
          description?: string;
          prerequisites?: string[];
          version?: number;
          source_url?: string | null;
          license?: string;
          reviewed?: boolean;
          chapter?: string | null;
          misconception_tags?: string[];
        };
        Relationships: [];
      };
      learning_profiles: {
        Row: {
          user_id: string;
          grade_band: string;
          curriculum: string;
          subjects: string[];
          goals: string[];
          interests: string[];
          preferred_language: string;
          explanation_depth: string;
          reminders_enabled: boolean;
          weekly_minutes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          grade_band?: string;
          curriculum?: string;
          subjects?: string[];
          goals?: string[];
          interests?: string[];
          preferred_language?: string;
          explanation_depth?: string;
          reminders_enabled?: boolean;
          weekly_minutes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          grade_band?: string;
          curriculum?: string;
          subjects?: string[];
          goals?: string[];
          interests?: string[];
          preferred_language?: string;
          explanation_depth?: string;
          reminders_enabled?: boolean;
          weekly_minutes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      learning_mastery: {
        Row: {
          user_id: string;
          concept_id: string;
          score: number;
          confidence: number;
          evidence_count: number;
          last_practiced_at: string | null;
          next_review_at: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          concept_id: string;
          score?: number;
          confidence?: number;
          evidence_count?: number;
          last_practiced_at?: string | null;
          next_review_at?: string | null;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          concept_id?: string;
          score?: number;
          confidence?: number;
          evidence_count?: number;
          last_practiced_at?: string | null;
          next_review_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "learning_mastery_concept_id_fkey";
            columns: ["concept_id"];
            isOneToOne: false;
            referencedRelation: "learning_concepts";
            referencedColumns: ["id"];
          },
        ];
      };
      learning_attempts: {
        Row: {
          id: string;
          user_id: string;
          concept_id: string;
          question: Json;
          answer: Json;
          correct: boolean | null;
          score: number | null;
          misconception: string | null;
          feedback: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          concept_id: string;
          question: Json;
          answer?: Json;
          correct?: boolean | null;
          score?: number | null;
          misconception?: string | null;
          feedback?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          concept_id?: string;
          question?: Json;
          answer?: Json;
          correct?: boolean | null;
          score?: number | null;
          misconception?: string | null;
          feedback?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "learning_attempts_concept_id_fkey";
            columns: ["concept_id"];
            isOneToOne: false;
            referencedRelation: "learning_concepts";
            referencedColumns: ["id"];
          },
        ];
      };
      learning_plans: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          starts_on: string;
          ends_on: string;
          status: string;
          generated_from: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          starts_on: string;
          ends_on: string;
          status?: string;
          generated_from?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          starts_on?: string;
          ends_on?: string;
          status?: string;
          generated_from?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      learning_plan_tasks: {
        Row: {
          id: string;
          plan_id: string;
          user_id: string;
          concept_id: string | null;
          title: string;
          task_type: string;
          due_at: string;
          estimated_minutes: number;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          user_id: string;
          concept_id?: string | null;
          title: string;
          task_type: string;
          due_at: string;
          estimated_minutes?: number;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          plan_id?: string;
          user_id?: string;
          concept_id?: string | null;
          title?: string;
          task_type?: string;
          due_at?: string;
          estimated_minutes?: number;
          status?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "learning_plan_tasks_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "learning_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "learning_plan_tasks_concept_id_fkey";
            columns: ["concept_id"];
            isOneToOne: false;
            referencedRelation: "learning_concepts";
            referencedColumns: ["id"];
          },
        ];
      };
      learning_sources: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          mime_type: string;
          storage_path: string | null;
          extracted_text: string | null;
          source_kind: string;
          provenance_url: string | null;
          license: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          mime_type: string;
          storage_path?: string | null;
          extracted_text?: string | null;
          source_kind: string;
          provenance_url?: string | null;
          license?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          mime_type?: string;
          storage_path?: string | null;
          extracted_text?: string | null;
          source_kind?: string;
          provenance_url?: string | null;
          license?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      learning_resources: {
        Row: {
          id: string;
          concept_id: string | null;
          source_id: string | null;
          user_id: string | null;
          title: string;
          summary: string;
          resource_type: string;
          url: string | null;
          provenance: string;
          license: string | null;
          reviewed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          concept_id?: string | null;
          source_id?: string | null;
          user_id?: string | null;
          title: string;
          summary: string;
          resource_type: string;
          url?: string | null;
          provenance: string;
          license?: string | null;
          reviewed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          concept_id?: string | null;
          source_id?: string | null;
          user_id?: string | null;
          title?: string;
          summary?: string;
          resource_type?: string;
          url?: string | null;
          provenance?: string;
          license?: string | null;
          reviewed?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "learning_resources_concept_id_fkey";
            columns: ["concept_id"];
            isOneToOne: false;
            referencedRelation: "learning_concepts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "learning_resources_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "learning_sources";
            referencedColumns: ["id"];
          },
        ];
      };
      learning_boards: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      learning_board_items: {
        Row: {
          board_id: string;
          resource_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          board_id: string;
          resource_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          board_id?: string;
          resource_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "learning_board_items_board_id_fkey";
            columns: ["board_id"];
            isOneToOne: false;
            referencedRelation: "learning_boards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "learning_board_items_resource_id_fkey";
            columns: ["resource_id"];
            isOneToOne: false;
            referencedRelation: "learning_resources";
            referencedColumns: ["id"];
          },
        ];
      };
      learning_reminders: {
        Row: {
          id: string;
          user_id: string;
          task_id: string | null;
          message: string;
          scheduled_for: string;
          delivered_at: string | null;
          dismissed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          task_id?: string | null;
          message: string;
          scheduled_for: string;
          delivered_at?: string | null;
          dismissed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          task_id?: string | null;
          message?: string;
          scheduled_for?: string;
          delivered_at?: string | null;
          dismissed_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "learning_reminders_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "learning_plan_tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      learning_sessions: {
        Row: {
          id: string;
          user_id: string;
          concept_id: string | null;
          title: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          concept_id?: string | null;
          title: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          concept_id?: string | null;
          title?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "learning_sessions_concept_id_fkey";
            columns: ["concept_id"];
            isOneToOne: false;
            referencedRelation: "learning_concepts";
            referencedColumns: ["id"];
          },
        ];
      };
      learning_messages: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          role: string;
          content: string;
          source_ids: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          role: string;
          content: string;
          source_ids?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          user_id?: string;
          role?: string;
          content?: string;
          source_ids?: string[];
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "learning_messages_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "learning_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      learning_evidence: {
        Row: {
          id: string;
          user_id: string;
          concept_id: string;
          session_id: string | null;
          evidence_type: string;
          score: number | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          concept_id: string;
          session_id?: string | null;
          evidence_type: string;
          score?: number | null;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          concept_id?: string;
          session_id?: string | null;
          evidence_type?: string;
          score?: number | null;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "learning_evidence_concept_id_fkey";
            columns: ["concept_id"];
            isOneToOne: false;
            referencedRelation: "learning_concepts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "learning_evidence_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "learning_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      learning_artifacts: {
        Row: {
          id: string;
          user_id: string;
          concept_id: string | null;
          session_id: string | null;
          artifact_type: string;
          title: string;
          content: Json;
          ai_generated: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          concept_id?: string | null;
          session_id?: string | null;
          artifact_type: string;
          title: string;
          content?: Json;
          ai_generated?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          concept_id?: string | null;
          session_id?: string | null;
          artifact_type?: string;
          title?: string;
          content?: Json;
          ai_generated?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "learning_artifacts_concept_id_fkey";
            columns: ["concept_id"];
            isOneToOne: false;
            referencedRelation: "learning_concepts";
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "learning_artifacts_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "learning_sessions";
            referencedColumns: ["id"],
          },
        ];
      };
      learning_source_chunks: {
        Row: {
          id: string;
          source_id: string;
          user_id: string;
          chunk_index: number;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          source_id: string;
          user_id: string;
          chunk_index: number;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          source_id?: string;
          user_id?: string;
          chunk_index?: number;
          content?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "learning_source_chunks_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "learning_sources";
            referencedColumns: ["id"],
          },
        ];
      };
      learning_integrations: {
        Row: {
          id: string;
          user_id: string;
          provider: string;
          status: string;
          display_name: string | null;
          metadata: Json;
          connected_at: string | null;
          last_synced_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider: string;
          status?: string;
          display_name?: string | null;
          metadata?: Json;
          connected_at?: string | null;
          last_synced_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          provider?: string;
          status?: string;
          display_name?: string | null;
          metadata?: Json;
          connected_at?: string | null;
          last_synced_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_shared_conversation: {
        Args: { share_token: string };
        Returns: {
          title: string;
          created_at: string;
          message_id: string;
          role: string;
          content: string;
          message_created_at: string;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
