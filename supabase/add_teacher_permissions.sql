-- Teacher Permissions Migration
-- Grants teachers DELETE and UPDATE permissions for content management
-- CORRECTED VERSION: Fixed task_boxes relationship

-- 1. Enable teachers to DELETE works (Inappropriate content)
-- Allow teachers to delete works if they are the teacher of the class the work belongs to
DROP POLICY IF EXISTS "Teachers can delete works" ON public.works;
CREATE POLICY "Teachers can delete works"
    ON public.works FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.task_boxes
            JOIN public.classes ON classes.id = task_boxes.class_id
            WHERE task_boxes.id = works.task_box_id
            AND classes.teacher_id = auth.uid()
        )
    );

-- 2. Enable teachers to DELETE teacher comments (Their own or cleanup)
DROP POLICY IF EXISTS "Teachers can delete comments" ON public.teacher_comments;
CREATE POLICY "Teachers can delete comments"
    ON public.teacher_comments FOR DELETE
    USING (
        teacher_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.works
            JOIN public.task_boxes ON task_boxes.id = works.task_box_id
            JOIN public.classes ON classes.id = task_boxes.class_id
            WHERE works.id = teacher_comments.work_id
            AND classes.teacher_id = auth.uid()
        )
    );

-- 3. Enable teachers to DELETE/UPDATE task_boxes
-- Corrected: task_boxes references classes, not teacher_id directly
DROP POLICY IF EXISTS "Teachers can delete task_boxes" ON public.task_boxes;
CREATE POLICY "Teachers can delete task_boxes"
    ON public.task_boxes FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.classes
            WHERE classes.id = task_boxes.class_id
            AND classes.teacher_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Teachers can update task_boxes" ON public.task_boxes;
CREATE POLICY "Teachers can update task_boxes"
    ON public.task_boxes FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.classes
            WHERE classes.id = task_boxes.class_id
            AND classes.teacher_id = auth.uid()
        )
    );

-- 4. Enable teachers to DELETE class_members (Remove student from class)
DROP POLICY IF EXISTS "Teachers can remove class_members" ON public.class_members;
CREATE POLICY "Teachers can remove class_members"
    ON public.class_members FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.classes
            WHERE classes.id = class_members.class_id
            AND classes.teacher_id = auth.uid()
        )
    );
