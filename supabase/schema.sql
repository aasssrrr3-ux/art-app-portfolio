-- ============================================================
-- 教育用プロセス・ポートフォリオ データベーススキーマ
-- Supabase SQL エディタで実行してください
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Users Table (extends auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- ============================================================
-- Classes Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  teacher_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Teachers can manage their own classes
CREATE POLICY "Teachers can view their classes"
  ON public.classes FOR SELECT
  USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can create classes"
  ON public.classes FOR INSERT
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers can update their classes"
  ON public.classes FOR UPDATE
  USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can delete their classes"
  ON public.classes FOR DELETE
  USING (teacher_id = auth.uid());

-- Students can search classes by code (for joining)
CREATE POLICY "Students can search classes by code"
  ON public.classes FOR SELECT
  USING (true);

-- ============================================================
-- Class Members Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.class_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  student_number INTEGER,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, user_id)
);

ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;

-- Students can see their memberships
CREATE POLICY "Students can view their class memberships"
  ON public.class_members FOR SELECT
  USING (user_id = auth.uid());

-- Teachers can see all members of their classes
CREATE POLICY "Teachers can view members of their classes"
  ON public.class_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = class_members.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

-- Teachers can add members to their classes
CREATE POLICY "Teachers can add members to their classes"
  ON public.class_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = class_id
      AND classes.teacher_id = auth.uid()
    )
  );

-- Students can join classes themselves
CREATE POLICY "Students can join classes"
  ON public.class_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- Task Boxes Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.task_boxes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  unit_name TEXT NOT NULL,
  task_name TEXT NOT NULL,
  due_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.task_boxes ENABLE ROW LEVEL SECURITY;

-- Teachers can manage task boxes
CREATE POLICY "Teachers can manage task boxes"
  ON public.task_boxes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = task_boxes.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

-- Students can view task boxes for their classes
CREATE POLICY "Students can view task boxes"
  ON public.task_boxes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.class_members
      WHERE class_members.class_id = task_boxes.class_id
      AND class_members.user_id = auth.uid()
    )
  );

-- ============================================================
-- Works Table (Student Submissions)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.works (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  task_box_id UUID REFERENCES public.task_boxes(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  brightness INTEGER DEFAULT 100,
  reflection TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.works ENABLE ROW LEVEL SECURITY;

-- Students can manage their own works
CREATE POLICY "Students can insert their works"
  ON public.works FOR INSERT
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can view their works"
  ON public.works FOR SELECT
  USING (student_id = auth.uid());

-- Teachers can view works in their classes
CREATE POLICY "Teachers can view works in their classes"
  ON public.works FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.task_boxes
      JOIN public.classes ON classes.id = task_boxes.class_id
      WHERE task_boxes.id = works.task_box_id
      AND classes.teacher_id = auth.uid()
    )
  );

-- Students can view classmates' works (for gallery)
CREATE POLICY "Students can view classmates works"
  ON public.works FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.task_boxes tb
      JOIN public.class_members cm ON cm.class_id = tb.class_id
      WHERE tb.id = works.task_box_id
      AND cm.user_id = auth.uid()
    )
  );

-- ============================================================
-- Shared Resources Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.shared_resources (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.shared_resources ENABLE ROW LEVEL SECURITY;

-- Teachers can manage shared resources
CREATE POLICY "Teachers can manage shared resources"
  ON public.shared_resources FOR ALL
  USING (teacher_id = auth.uid());

-- Students can view shared resources for their classes
CREATE POLICY "Students can view shared resources"
  ON public.shared_resources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.class_members
      WHERE class_members.class_id = shared_resources.class_id
      AND class_members.user_id = auth.uid()
    )
  );

-- ============================================================
-- Storage Buckets
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('works', 'works', true)
ON CONFLICT DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('resources', 'resources', true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Storage RLS Policies (本番環境用セキュリティ設定)
-- ============================================================

-- 認証ユーザーのみ works バケットにアップロード可能
CREATE POLICY "Authenticated users can upload to works"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'works');

-- 認証ユーザーのみ resources バケットにアップロード可能
CREATE POLICY "Authenticated users can upload to resources"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'resources');

-- 全員が画像を閲覧可能（Public bucket）
CREATE POLICY "Anyone can view images"
ON storage.objects FOR SELECT
USING (bucket_id IN ('works', 'resources'));

-- 自分がアップロードしたファイルのみ更新可能
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (auth.uid()::text = (storage.foldername(name))[1]);

-- 自分がアップロードしたファイルのみ削除可能
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (auth.uid()::text = (storage.foldername(name))[1]);
