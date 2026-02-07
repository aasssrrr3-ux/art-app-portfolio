-- ============================================================
-- Grade View バグ修正: 先生がクラスメンバーの名前を閲覧可能にする
-- Supabase SQL エディタで実行してください
-- ============================================================

-- 先生が自分のクラスのメンバーの情報を閲覧できるポリシーを追加
DROP POLICY IF EXISTS "Teachers can view their class members info" ON public.users;
CREATE POLICY "Teachers can view their class members info"
  ON public.users FOR SELECT
  USING (
    -- 自分自身のプロフィール
    auth.uid() = id
    OR
    -- 先生が管理するクラスのメンバー
    EXISTS (
      SELECT 1 FROM public.class_members cm
      JOIN public.classes c ON c.id = cm.class_id
      WHERE cm.user_id = users.id
      AND c.teacher_id = auth.uid()
    )
  );

-- 既存の「自分のみ閲覧可能」ポリシーを削除（新しいポリシーに統合済み）
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
