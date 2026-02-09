-- Enable RLS for relevant tables (ensure they are enabled)
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 1. Policies for 'classes' table
-- Allow teachers to view their own classes
DROP POLICY IF EXISTS "Teachers can view own classes" ON classes;
CREATE POLICY "Teachers can view own classes"
ON classes FOR SELECT
TO authenticated
USING (teacher_id = auth.uid());

-- Allow teachers to create classes (assigning themselves as teacher)
DROP POLICY IF EXISTS "Teachers can insert own classes" ON classes;
CREATE POLICY "Teachers can insert own classes"
ON classes FOR INSERT
TO authenticated
WITH CHECK (teacher_id = auth.uid());

-- Allow teachers to update their own classes
DROP POLICY IF EXISTS "Teachers can update own classes" ON classes;
CREATE POLICY "Teachers can update own classes"
ON classes FOR UPDATE
TO authenticated
USING (teacher_id = auth.uid())
WITH CHECK (teacher_id = auth.uid());

-- Allow teachers to delete their own classes
DROP POLICY IF EXISTS "Teachers can delete own classes" ON classes;
CREATE POLICY "Teachers can delete own classes"
ON classes FOR DELETE
TO authenticated
USING (teacher_id = auth.uid());


-- 2. Policies for 'task_boxes' table
-- Allow teachers to view task boxes for their classes
DROP POLICY IF EXISTS "Teachers can view task boxes" ON task_boxes;
CREATE POLICY "Teachers can view task boxes"
ON task_boxes FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = task_boxes.class_id
    AND classes.teacher_id = auth.uid()
  )
);

-- Allow teachers to insert task boxes for their classes
DROP POLICY IF EXISTS "Teachers can insert task boxes" ON task_boxes;
CREATE POLICY "Teachers can insert task boxes"
ON task_boxes FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = task_boxes.class_id
    AND classes.teacher_id = auth.uid()
  )
);

-- Allow teachers to update task boxes for their classes
DROP POLICY IF EXISTS "Teachers can update task boxes" ON task_boxes;
CREATE POLICY "Teachers can update task boxes"
ON task_boxes FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = task_boxes.class_id
    AND classes.teacher_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = task_boxes.class_id
    AND classes.teacher_id = auth.uid()
  )
);

-- Allow teachers to delete task boxes for their classes
DROP POLICY IF EXISTS "Teachers can delete task boxes" ON task_boxes;
CREATE POLICY "Teachers can delete task boxes"
ON task_boxes FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = task_boxes.class_id
    AND classes.teacher_id = auth.uid()
  )
);


-- 3. Policies for 'users' table (to prevent fetching empty user data)
-- Allow users to view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile"
ON users FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());
