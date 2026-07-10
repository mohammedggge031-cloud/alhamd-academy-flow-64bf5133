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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      academy_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Relationships: []
      }
      approval_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          details: Json | null
          id: string
          original_data: Json | null
          request_type: string
          session_id: string | null
          status: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          original_data?: Json | null
          request_type: string
          session_id?: string | null
          status?: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          original_data?: Json | null
          request_type?: string
          session_id?: string | null
          status?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers_manager_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers_self_view"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string | null
          after: Json | null
          before: Json | null
          created_at: string
          entity_id: string | null
          entity_table: string
          id: string
          ip_address: string | null
          reason: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_table: string
          id?: string
          ip_address?: string | null
          reason?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_table?: string
          id?: string
          ip_address?: string | null
          reason?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          description: string
          expense_month: string
          id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string
          created_by?: string | null
          description: string
          expense_month: string
          id?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          expense_month?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      external_sync_config: {
        Row: {
          created_at: string
          enabled: boolean
          function_url: string
          id: boolean
          sync_secret: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          function_url: string
          id?: boolean
          sync_secret?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          function_url?: string
          id?: boolean
          sync_secret?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      external_sync_events: {
        Row: {
          attempts: number
          created_at: string
          id: string
          last_error: string | null
          old_payload: Json | null
          operation: string
          payload: Json | null
          processed_at: string | null
          record_id: string | null
          status: string
          table_name: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          old_payload?: Json | null
          operation: string
          payload?: Json | null
          processed_at?: string | null
          record_id?: string | null
          status?: string
          table_name: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          old_payload?: Json | null
          operation?: string
          payload?: Json | null
          processed_at?: string | null
          record_id?: string | null
          status?: string
          table_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoice_students: {
        Row: {
          amount: number
          created_at: string
          hours: number
          id: string
          invoice_id: string
          student_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          hours?: number
          id?: string
          invoice_id: string
          student_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          hours?: number
          id?: string
          invoice_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_students_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          discount: number | null
          due_date: string | null
          hours: number | null
          id: string
          notes: string | null
          package_id: string | null
          paid_at: string | null
          status: string
          student_id: string | null
          total: number
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          discount?: number | null
          due_date?: string | null
          hours?: number | null
          id?: string
          notes?: string | null
          package_id?: string | null
          paid_at?: string | null
          status?: string
          student_id?: string | null
          total: number
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          discount?: number | null
          due_date?: string | null
          hours?: number | null
          id?: string
          notes?: string | null
          package_id?: string | null
          paid_at?: string | null
          status?: string
          student_id?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_reports: {
        Row: {
          attendance_rating: string | null
          behavior_notes: string | null
          created_at: string
          id: string
          overall_grade: string | null
          quran_progress: string | null
          recommendations: string | null
          report_month: string
          strengths: string | null
          student_id: string
          tajweed_level: string | null
          teacher_id: string
          updated_at: string
          weaknesses: string | null
        }
        Insert: {
          attendance_rating?: string | null
          behavior_notes?: string | null
          created_at?: string
          id?: string
          overall_grade?: string | null
          quran_progress?: string | null
          recommendations?: string | null
          report_month: string
          strengths?: string | null
          student_id: string
          tajweed_level?: string | null
          teacher_id: string
          updated_at?: string
          weaknesses?: string | null
        }
        Update: {
          attendance_rating?: string | null
          behavior_notes?: string | null
          created_at?: string
          id?: string
          overall_grade?: string | null
          quran_progress?: string | null
          recommendations?: string | null
          report_month?: string
          strengths?: string | null
          student_id?: string
          tajweed_level?: string | null
          teacher_id?: string
          updated_at?: string
          weaknesses?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monthly_reports_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_reports_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_reports_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers_manager_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_reports_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers_self_view"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          group_id: string | null
          id: string
          is_read: boolean
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          is_read?: boolean
          metadata?: Json | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          is_read?: boolean
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      parents: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          updated_at: string
          user_id: string | null
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      permissions: {
        Row: {
          action: string
          created_at: string
          id: string
          module: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          module: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          module?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          dot_color: string | null
          full_name: string
          id: string
          updated_at: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          dot_color?: string | null
          full_name: string
          id?: string
          updated_at?: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          dot_color?: string | null
          full_name?: string
          id?: string
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      regulations: {
        Row: {
          created_at: string
          id: string
          items: Json
          items_en: Json | null
          section_order: number
          section_title: string
          section_title_en: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          items?: Json
          items_en?: Json | null
          section_order?: number
          section_title: string
          section_title_en?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          items_en?: Json | null
          section_order?: number
          section_title?: string
          section_title_en?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      session_edit_requests: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          requested_changes: Json
          reviewed_at: string | null
          reviewed_by: string | null
          session_id: string
          status: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          requested_changes: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_id: string
          status?: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          requested_changes?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_id?: string
          status?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_edit_requests_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_edit_requests_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_edit_requests_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers_manager_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_edit_requests_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers_self_view"
            referencedColumns: ["id"]
          },
        ]
      }
      session_reports: {
        Row: {
          admin_alert: boolean | null
          admin_alert_reason: string | null
          created_at: string
          homework: string | null
          homework_sent: boolean | null
          id: string
          session_id: string
          session_notes: string | null
          student_id: string
          student_level: string
          teacher_id: string
        }
        Insert: {
          admin_alert?: boolean | null
          admin_alert_reason?: string | null
          created_at?: string
          homework?: string | null
          homework_sent?: boolean | null
          id?: string
          session_id: string
          session_notes?: string | null
          student_id: string
          student_level: string
          teacher_id: string
        }
        Update: {
          admin_alert?: boolean | null
          admin_alert_reason?: string | null
          created_at?: string
          homework?: string | null
          homework_sent?: boolean | null
          id?: string
          session_id?: string
          session_notes?: string | null
          student_id?: string
          student_level?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_reports_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_reports_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_reports_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_reports_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers_manager_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_reports_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers_self_view"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          absence_decision: string | null
          absence_reviewed: boolean
          absence_reviewed_at: string | null
          absence_reviewed_by: string | null
          approval_status: string | null
          created_at: string
          duration_minutes: number
          exception_minutes: number | null
          id: string
          locked_by_teacher: boolean
          notes: string | null
          original_data: Json | null
          pending_approval: boolean | null
          session_date: string
          start_time: string | null
          status: string
          student_id: string
          teacher_id: string
          teacher_paid: boolean | null
          updated_at: string
          waiting_minutes: number | null
        }
        Insert: {
          absence_decision?: string | null
          absence_reviewed?: boolean
          absence_reviewed_at?: string | null
          absence_reviewed_by?: string | null
          approval_status?: string | null
          created_at?: string
          duration_minutes?: number
          exception_minutes?: number | null
          id?: string
          locked_by_teacher?: boolean
          notes?: string | null
          original_data?: Json | null
          pending_approval?: boolean | null
          session_date: string
          start_time?: string | null
          status?: string
          student_id: string
          teacher_id: string
          teacher_paid?: boolean | null
          updated_at?: string
          waiting_minutes?: number | null
        }
        Update: {
          absence_decision?: string | null
          absence_reviewed?: boolean
          absence_reviewed_at?: string | null
          absence_reviewed_by?: string | null
          approval_status?: string | null
          created_at?: string
          duration_minutes?: number
          exception_minutes?: number | null
          id?: string
          locked_by_teacher?: boolean
          notes?: string | null
          original_data?: Json | null
          pending_approval?: boolean | null
          session_date?: string
          start_time?: string | null
          status?: string
          student_id?: string
          teacher_id?: string
          teacher_paid?: boolean | null
          updated_at?: string
          waiting_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers_manager_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers_self_view"
            referencedColumns: ["id"]
          },
        ]
      }
      student_ledger: {
        Row: {
          amount_delta: number
          created_at: string
          created_by: string | null
          entry_type: string
          hours_delta: number
          id: string
          invoice_id: string | null
          notes: string | null
          session_id: string | null
          student_id: string
        }
        Insert: {
          amount_delta?: number
          created_at?: string
          created_by?: string | null
          entry_type: string
          hours_delta?: number
          id?: string
          invoice_id?: string | null
          notes?: string | null
          session_id?: string | null
          student_id: string
        }
        Update: {
          amount_delta?: number
          created_at?: string
          created_by?: string | null
          entry_type?: string
          hours_delta?: number
          id?: string
          invoice_id?: string | null
          notes?: string | null
          session_id?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_ledger_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_parents: {
        Row: {
          created_at: string
          id: string
          parent_id: string
          relationship: string | null
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parent_id: string
          relationship?: string | null
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parent_id?: string
          relationship?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_parents_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_parents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          absence_hours: number | null
          age: number | null
          assigned_teacher_id: string | null
          attended_hours: number | null
          communication_language: string | null
          country: string | null
          created_at: string
          current_package_id: string | null
          guardian_whatsapp: string | null
          id: string
          is_active: boolean | null
          name: string
          paid_hours: number | null
          remaining_hours: number | null
          schedule: Json | null
          session_duration_minutes: number | null
          subscription_end_date: string | null
          subscription_hours: number | null
          subscription_start_date: string | null
          subscription_status: string
          timezone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          absence_hours?: number | null
          age?: number | null
          assigned_teacher_id?: string | null
          attended_hours?: number | null
          communication_language?: string | null
          country?: string | null
          created_at?: string
          current_package_id?: string | null
          guardian_whatsapp?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          paid_hours?: number | null
          remaining_hours?: number | null
          schedule?: Json | null
          session_duration_minutes?: number | null
          subscription_end_date?: string | null
          subscription_hours?: number | null
          subscription_start_date?: string | null
          subscription_status?: string
          timezone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          absence_hours?: number | null
          age?: number | null
          assigned_teacher_id?: string | null
          attended_hours?: number | null
          communication_language?: string | null
          country?: string | null
          created_at?: string
          current_package_id?: string | null
          guardian_whatsapp?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          paid_hours?: number | null
          remaining_hours?: number | null
          schedule?: Json | null
          session_duration_minutes?: number | null
          subscription_end_date?: string | null
          subscription_hours?: number | null
          subscription_start_date?: string | null
          subscription_status?: string
          timezone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_assigned_teacher_id_fkey"
            columns: ["assigned_teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_assigned_teacher_id_fkey"
            columns: ["assigned_teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers_manager_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_assigned_teacher_id_fkey"
            columns: ["assigned_teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers_self_view"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_packages: {
        Row: {
          created_at: string
          currency: string
          hours: number
          id: string
          is_active: boolean
          name: string
          price: number
          updated_at: string
          validity_days: number
        }
        Insert: {
          created_at?: string
          currency?: string
          hours: number
          id?: string
          is_active?: boolean
          name: string
          price: number
          updated_at?: string
          validity_days?: number
        }
        Update: {
          created_at?: string
          currency?: string
          hours?: number
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          updated_at?: string
          validity_days?: number
        }
        Relationships: []
      }
      subscription_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_read: boolean
          message: string | null
          phone: string
          plan_name: string
          plan_price: string | null
          sessions_per_week: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_read?: boolean
          message?: string | null
          phone: string
          plan_name: string
          plan_price?: string | null
          sessions_per_week?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_read?: boolean
          message?: string | null
          phone?: string
          plan_name?: string
          plan_price?: string | null
          sessions_per_week?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      teacher_documents: {
        Row: {
          created_at: string
          description: string | null
          document_type: string
          file_name: string
          file_url: string
          id: string
          teacher_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          document_type: string
          file_name: string
          file_url: string
          id?: string
          teacher_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          document_type?: string
          file_name?: string
          file_url?: string
          id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_documents_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_documents_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers_manager_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_documents_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers_self_view"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_ledger: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          entry_type: string
          id: string
          minutes: number
          notes: string | null
          payroll_month: string | null
          session_id: string | null
          teacher_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          entry_type: string
          id?: string
          minutes?: number
          notes?: string | null
          payroll_month?: string | null
          session_id?: string | null
          teacher_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          entry_type?: string
          id?: string
          minutes?: number
          notes?: string | null
          payroll_month?: string | null
          session_id?: string | null
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_ledger_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_ledger_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers_manager_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_ledger_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers_self_view"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          about: string | null
          academic_degree: string | null
          age: number | null
          bio: string | null
          bonus_amount: number | null
          bonus_reason: string | null
          created_at: string
          gender: string | null
          hourly_rate: number
          id: string
          ijazat: string | null
          is_active: boolean | null
          monthly_absence_hours: number | null
          monthly_hours: number | null
          monthly_salary: number | null
          monthly_waiting_minutes: number | null
          profile_completed: boolean | null
          qualification: string | null
          rate_currency: string
          rating: number | null
          show_on_website: boolean | null
          students_count: number | null
          subjects: string[] | null
          updated_at: string
          user_id: string
          website_visible_fields: string[] | null
          zoom_link: string | null
        }
        Insert: {
          about?: string | null
          academic_degree?: string | null
          age?: number | null
          bio?: string | null
          bonus_amount?: number | null
          bonus_reason?: string | null
          created_at?: string
          gender?: string | null
          hourly_rate?: number
          id?: string
          ijazat?: string | null
          is_active?: boolean | null
          monthly_absence_hours?: number | null
          monthly_hours?: number | null
          monthly_salary?: number | null
          monthly_waiting_minutes?: number | null
          profile_completed?: boolean | null
          qualification?: string | null
          rate_currency?: string
          rating?: number | null
          show_on_website?: boolean | null
          students_count?: number | null
          subjects?: string[] | null
          updated_at?: string
          user_id: string
          website_visible_fields?: string[] | null
          zoom_link?: string | null
        }
        Update: {
          about?: string | null
          academic_degree?: string | null
          age?: number | null
          bio?: string | null
          bonus_amount?: number | null
          bonus_reason?: string | null
          created_at?: string
          gender?: string | null
          hourly_rate?: number
          id?: string
          ijazat?: string | null
          is_active?: boolean | null
          monthly_absence_hours?: number | null
          monthly_hours?: number | null
          monthly_salary?: number | null
          monthly_waiting_minutes?: number | null
          profile_completed?: boolean | null
          qualification?: string | null
          rate_currency?: string
          rating?: number | null
          show_on_website?: boolean | null
          students_count?: number | null
          subjects?: string[] | null
          updated_at?: string
          user_id?: string
          website_visible_fields?: string[] | null
          zoom_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teachers_profile_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      trial_bookings: {
        Row: {
          admin_notes: string | null
          course_interest: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_read: boolean
          message: string | null
          phone: string
          preferred_date: string | null
          preferred_time: string | null
          status: string
          timezone: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          course_interest?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_read?: boolean
          message?: string | null
          phone: string
          preferred_date?: string | null
          preferred_time?: string | null
          status?: string
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          course_interest?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_read?: boolean
          message?: string | null
          phone?: string
          preferred_date?: string | null
          preferred_time?: string | null
          status?: string
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
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
    }
    Views: {
      teacher_ledger_academic_view: {
        Row: {
          created_at: string | null
          entry_type: string | null
          id: string | null
          minutes: number | null
          notes: string | null
          payroll_month: string | null
          session_id: string | null
          teacher_id: string | null
        }
        Insert: {
          created_at?: string | null
          entry_type?: string | null
          id?: string | null
          minutes?: number | null
          notes?: string | null
          payroll_month?: string | null
          session_id?: string | null
          teacher_id?: string | null
        }
        Update: {
          created_at?: string | null
          entry_type?: string | null
          id?: string | null
          minutes?: number | null
          notes?: string | null
          payroll_month?: string | null
          session_id?: string | null
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_ledger_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_ledger_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers_manager_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_ledger_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers_self_view"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers_manager_view: {
        Row: {
          academic_degree: string | null
          age: number | null
          bio: string | null
          created_at: string | null
          gender: string | null
          id: string | null
          ijazat: string | null
          is_active: boolean | null
          profile_completed: boolean | null
          qualification: string | null
          rate_currency: string | null
          rating: number | null
          show_on_website: boolean | null
          students_count: number | null
          subjects: string[] | null
          updated_at: string | null
          user_id: string | null
          website_visible_fields: string[] | null
          zoom_link: string | null
        }
        Insert: {
          academic_degree?: string | null
          age?: number | null
          bio?: string | null
          created_at?: string | null
          gender?: string | null
          id?: string | null
          ijazat?: string | null
          is_active?: boolean | null
          profile_completed?: boolean | null
          qualification?: string | null
          rate_currency?: string | null
          rating?: number | null
          show_on_website?: boolean | null
          students_count?: number | null
          subjects?: string[] | null
          updated_at?: string | null
          user_id?: string | null
          website_visible_fields?: string[] | null
          zoom_link?: string | null
        }
        Update: {
          academic_degree?: string | null
          age?: number | null
          bio?: string | null
          created_at?: string | null
          gender?: string | null
          id?: string | null
          ijazat?: string | null
          is_active?: boolean | null
          profile_completed?: boolean | null
          qualification?: string | null
          rate_currency?: string | null
          rating?: number | null
          show_on_website?: boolean | null
          students_count?: number | null
          subjects?: string[] | null
          updated_at?: string | null
          user_id?: string | null
          website_visible_fields?: string[] | null
          zoom_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teachers_profile_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      teachers_self_view: {
        Row: {
          age: number | null
          created_at: string | null
          hourly_rate: number | null
          id: string | null
          is_active: boolean | null
          qualification: string | null
          user_id: string | null
          zoom_link: string | null
        }
        Insert: {
          age?: number | null
          created_at?: string | null
          hourly_rate?: number | null
          id?: string | null
          is_active?: boolean | null
          qualification?: string | null
          user_id?: string | null
          zoom_link?: string | null
        }
        Update: {
          age?: number | null
          created_at?: string | null
          hourly_rate?: number | null
          id?: string | null
          is_active?: boolean | null
          qualification?: string | null
          user_id?: string | null
          zoom_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teachers_profile_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Functions: {
      add_bonus_session: {
        Args: { _hours: number; _reason: string; _student_id: string }
        Returns: string
      }
      apply_absence_decision: {
        Args: { _decision: string; _reason?: string; _session_id: string }
        Returns: undefined
      }
      claim_external_sync_events: {
        Args: { _limit?: number }
        Returns: {
          attempts: number
          created_at: string
          id: string
          last_error: string | null
          old_payload: Json | null
          operation: string
          payload: Json | null
          processed_at: string | null
          record_id: string | null
          status: string
          table_name: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "external_sync_events"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_permission: {
        Args: { _action: string; _module: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_parent_of: {
        Args: { _parent_user_id: string; _student_id: string }
        Returns: boolean
      }
      log_audit: {
        Args: {
          _action: string
          _after?: Json
          _before?: Json
          _entity_id: string
          _entity_table: string
          _reason?: string
        }
        Returns: string
      }
      mark_all_notifications_read: {
        Args: { _user_id: string }
        Returns: undefined
      }
      mark_external_sync_event_result: {
        Args: { _event_id: string; _last_error?: string; _status: string }
        Returns: undefined
      }
      mark_notification_group_read: {
        Args: { _notification_id: string }
        Returns: undefined
      }
      recalc_student_balance: {
        Args: { _student_id: string }
        Returns: undefined
      }
      recalc_subscription_status: {
        Args: { _student_id: string }
        Returns: undefined
      }
      recalc_teacher_monthly_stats: {
        Args: { _teacher_id: string }
        Returns: undefined
      }
      refresh_all_subscription_statuses: { Args: never; Returns: undefined }
      request_external_sync_processing: { Args: never; Returns: undefined }
      set_external_sync_config:
        | { Args: { _function_url: string }; Returns: undefined }
        | {
            Args: { _function_url: string; _sync_secret?: string }
            Returns: undefined
          }
      touch_external_sync_event: {
        Args: { _event_id: string; _last_error?: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "teacher" | "manager" | "student" | "parent"
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
      app_role: ["admin", "teacher", "manager", "student", "parent"],
    },
  },
} as const
