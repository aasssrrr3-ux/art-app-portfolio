-- ============================================================
-- お気に入り機能追加
-- ============================================================

-- favorites テーブル作成
CREATE TABLE IF NOT EXISTS public.favorites (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, work_id)
);

-- RLS有効化
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- ポリシー設定（既存のものを削除してから作成）

-- 1. 自分のお気に入りのみ操作可能 (INSERT)
DROP POLICY IF EXISTS "Users can add favorites" ON public.favorites;
CREATE POLICY "Users can add favorites"
    ON public.favorites FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 2. 自分のお気に入りのみ操作可能 (DELETE)
DROP POLICY IF EXISTS "Users can remove favorites" ON public.favorites;
CREATE POLICY "Users can remove favorites"
    ON public.favorites FOR DELETE
    USING (auth.uid() = user_id);

-- 3. 自分のお気に入りのみ閲覧可能 (SELECT)
DROP POLICY IF EXISTS "Users can view their own favorites" ON public.favorites;
CREATE POLICY "Users can view their own favorites"
    ON public.favorites FOR SELECT
    USING (auth.uid() = user_id);
