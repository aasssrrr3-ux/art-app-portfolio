-- ============================================================
-- 生徒間アノテーション機能のRLS追加
-- Supabase SQL エディタで実行してください
-- ============================================================

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Students can add annotations to their own works" ON public.annotations;

-- 生徒は同じクラスのメンバーの作品にアノテーション追加可能
CREATE POLICY "Students can add annotations to classmates works"
  ON public.annotations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.works w
      JOIN public.task_boxes tb ON tb.id = w.task_box_id
      JOIN public.class_members cm ON cm.class_id = tb.class_id
      WHERE w.id = annotations.work_id
      AND cm.user_id = auth.uid()
    )
  );

-- 生徒は自分のアノテーションを削除可能
DROP POLICY IF EXISTS "Users can delete their own annotations" ON public.annotations;
CREATE POLICY "Users can delete their own annotations"
  ON public.annotations FOR DELETE
  USING (user_id = auth.uid());

-- 生徒は自分のアノテーションを更新可能
DROP POLICY IF EXISTS "Users can update their own annotations" ON public.annotations;
CREATE POLICY "Users can update their own annotations"
  ON public.annotations FOR UPDATE
  USING (user_id = auth.uid());
