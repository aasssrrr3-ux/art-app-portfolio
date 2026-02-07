-- ============================================================
-- 先生コメント機能テーブル追加
-- Supabase SQL エディタで実行してください
-- ============================================================

-- ============================================================
-- Teacher Comments Table (先生から生徒作品へのコメント)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.teacher_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  work_id UUID REFERENCES public.works(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(work_id, teacher_id)  -- 1作品に1先生1コメント
);

ALTER TABLE public.teacher_comments ENABLE ROW LEVEL SECURITY;

-- 先生は自分のクラスの作品にコメント可能
DROP POLICY IF EXISTS "Teachers can manage comments on their class works" ON public.teacher_comments;
CREATE POLICY "Teachers can manage comments on their class works"
  ON public.teacher_comments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.works w
      JOIN public.task_boxes tb ON tb.id = w.task_box_id
      JOIN public.classes c ON c.id = tb.class_id
      WHERE w.id = teacher_comments.work_id
      AND c.teacher_id = auth.uid()
    )
  );

-- 生徒は自分の作品へのコメントを閲覧可能
DROP POLICY IF EXISTS "Students can view comments on their works" ON public.teacher_comments;
CREATE POLICY "Students can view comments on their works"
  ON public.teacher_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.works w
      WHERE w.id = teacher_comments.work_id
      AND w.student_id = auth.uid()
    )
  );
