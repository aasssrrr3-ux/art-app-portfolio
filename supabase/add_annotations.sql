-- ============================================================
-- 丸囲みコメント機能テーブル追加
-- Supabase SQL エディタで実行してください
-- ============================================================

-- アノテーション（丸囲み）テーブル
CREATE TABLE IF NOT EXISTS public.annotations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  work_id UUID REFERENCES public.works(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  x_percent FLOAT NOT NULL,  -- 画像上のX位置（0-100%）
  y_percent FLOAT NOT NULL,  -- 画像上のY位置（0-100%）
  radius_percent FLOAT DEFAULT 5,  -- 丸の半径（画像幅の%）
  comment TEXT,
  color TEXT DEFAULT '#FF4444',  -- 丸の色
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.annotations ENABLE ROW LEVEL SECURITY;

-- 先生は自分のクラスの作品にアノテーション追加可能
DROP POLICY IF EXISTS "Teachers can manage annotations on their class works" ON public.annotations;
CREATE POLICY "Teachers can manage annotations on their class works"
  ON public.annotations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.works w
      JOIN public.task_boxes tb ON tb.id = w.task_box_id
      JOIN public.classes c ON c.id = tb.class_id
      WHERE w.id = annotations.work_id
      AND c.teacher_id = auth.uid()
    )
  );

-- 生徒は自分のクラスの作品へのアノテーションを閲覧可能
DROP POLICY IF EXISTS "Students can view annotations in their class" ON public.annotations;
CREATE POLICY "Students can view annotations in their class"
  ON public.annotations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.works w
      JOIN public.task_boxes tb ON tb.id = w.task_box_id
      JOIN public.class_members cm ON cm.class_id = tb.class_id
      WHERE w.id = annotations.work_id
      AND cm.user_id = auth.uid()
    )
  );

-- 生徒は自分の作品にアノテーション追加可能
DROP POLICY IF EXISTS "Students can add annotations to their own works" ON public.annotations;
CREATE POLICY "Students can add annotations to their own works"
  ON public.annotations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.works w
      WHERE w.id = annotations.work_id
      AND w.student_id = auth.uid()
    )
  );
