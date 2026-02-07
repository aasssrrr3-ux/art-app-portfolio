-- ============================================================
-- ログイン問題修正: users テーブルのRLSポリシー
-- Supabase SQL エディタで実行してください
-- ============================================================

-- 既存のポリシーを全て削除
DROP POLICY IF EXISTS "Teachers can view their class members info" ON public.users;
DROP POLICY IF EXISTS "Teachers can view their class members" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Students can view classmates" ON public.users;

-- ポリシー1: 自分自身のプロフィールは常に閲覧可能
CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- ポリシー2: 先生は自分のクラスのメンバー情報を閲覧可能
CREATE POLICY "Teachers can view their class members"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.class_members cm
      JOIN public.classes c ON c.id = cm.class_id
      WHERE cm.user_id = users.id
      AND c.teacher_id = auth.uid()
    )
  );

-- ポリシー3: 同じクラスのメンバー同士も閲覧可能（ギャラリー表示用）
CREATE POLICY "Students can view classmates"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.class_members cm1
      JOIN public.class_members cm2 ON cm1.class_id = cm2.class_id
      WHERE cm1.user_id = auth.uid()
      AND cm2.user_id = users.id
    )
  );

-- 確認用（オプション）
-- SELECT * FROM pg_policies WHERE tablename = 'users';
