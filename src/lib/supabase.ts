import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (typeof window !== 'undefined') {
  console.log('[Supabase] Initializing client', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    urlPrefix: supabaseUrl ? supabaseUrl.substring(0, 8) : 'N/A'
  })
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export type Role = 'student' | 'teacher'

export interface User {
  id: string
  email: string
  name: string
  role: Role
  created_at: string
}

export interface Class {
  id: string
  name: string
  code: string
  teacher_id: string
  created_at: string
}

export interface ClassMember {
  id: string
  class_id: string
  user_id: string
  student_number: number
  joined_at: string
}

export interface TaskBox {
  id: string
  class_id: string
  unit_name: string
  task_name: string
  due_date: string
  is_active: boolean
  created_at: string
}

export interface Work {
  id: string
  student_id: string
  task_box_id: string
  image_url: string
  brightness: number
  reflection: string
  created_at: string
}

export interface SharedResource {
  id: string
  class_id: string
  teacher_id: string
  title: string
  image_url: string
  created_at: string
}

export interface TeacherComment {
  id: string
  work_id: string
  teacher_id: string
  comment: string
  created_at: string
}

export interface Annotation {
  id: string
  work_id: string
  user_id: string
  x_percent: number
  y_percent: number
  radius_percent: number
  comment: string | null
  color: string
  created_at: string
}
