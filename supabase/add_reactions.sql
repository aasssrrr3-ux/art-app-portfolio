-- ============================================================
-- リアクション機能追加
-- ============================================================

-- reactions テーブル作成
CREATE TABLE IF NOT EXISTS public.reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL, -- 'fire', 'heart', 'star', 'clap' etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS有効化
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

-- ポリシー設定（既存のものを削除してから作成）

-- 1. 誰でもリアクションを追加できる（自分の作品以外）
DROP POLICY IF EXISTS "Students can add reactions" ON public.reactions;
CREATE POLICY "Students can add reactions"
    ON public.reactions FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

-- 2. 自分の作品のリアクションは見れる
DROP POLICY IF EXISTS "Users can view reactions on their works" ON public.reactions;
CREATE POLICY "Users can view reactions on their works"
    ON public.reactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.works w
            WHERE w.id = reactions.work_id
            AND w.student_id = auth.uid()
        )
    );

-- 3. 送った本人は自分のリアクションを見れる（取り消し用など）
DROP POLICY IF EXISTS "Users can view their own reactions" ON public.reactions;
CREATE POLICY "Users can view their own reactions"
    ON public.reactions FOR SELECT
    USING (auth.uid() = sender_id);

-- 4. クラスメイトの作品に対するリアクションは見れる
DROP POLICY IF EXISTS "Students can view reactions in class" ON public.reactions;
CREATE POLICY "Students can view reactions in class"
    ON public.reactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.works w
            JOIN public.class_members cm1 ON w.student_id = cm1.user_id
            JOIN public.class_members cm2 ON cm1.class_id = cm2.class_id
            WHERE w.id = reactions.work_id
            AND cm2.user_id = auth.uid()
        )
    );

-- 5. 先生は全て見れる
DROP POLICY IF EXISTS "Teachers can view all reactions" ON public.reactions;
CREATE POLICY "Teachers can view all reactions"
    ON public.reactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.works w
            JOIN public.classes c ON c.id = (SELECT class_id FROM public.task_boxes WHERE id = w.task_box_id)
            WHERE w.id = reactions.work_id
            AND c.teacher_id = auth.uid()
        )
    );
