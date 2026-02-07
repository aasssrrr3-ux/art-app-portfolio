/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Admin Client with Service Role Key for privileged operations
// This bypasses RLS, so use carefully
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
)

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { action, studentId, newPassword, classId, taskBoxId, unitName, taskName, dueDate } = body

        // 1. Verify Teacher Session using @supabase/ssr
        const cookieStore = await cookies()

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value
                    },
                },
            }
        )

        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Verify role is teacher
        const { data: user } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single()

        if (!user || user.role !== 'teacher') {
            return NextResponse.json({ error: 'Forbidden: Teacher access required' }, { status: 403 })
        }

        // 2. Handle Actions
        if (action === 'resetPassword') {
            if (!studentId || !newPassword) {
                return NextResponse.json({ error: 'Missing studentId or newPassword' }, { status: 400 })
            }

            const { error } = await supabaseAdmin.auth.admin.updateUserById(
                studentId,
                { password: newPassword }
            )

            if (error) throw error

            return NextResponse.json({ success: true, message: 'Password updated successfully' })
        }

        if (action === 'removeStudent') {
            if (!studentId || !classId) {
                return NextResponse.json({ error: 'Missing studentId or classId' }, { status: 400 })
            }

            // Verify teacher owns the class
            const { data: classData } = await supabase
                .from('classes')
                .select('teacher_id')
                .eq('id', classId)
                .single()

            if (!classData || classData.teacher_id !== session.user.id) {
                return NextResponse.json({ error: 'Forbidden: You do not own this class' }, { status: 403 })
            }

            // Remove from class_members
            const { error } = await supabaseAdmin
                .from('class_members')
                .delete()
                .match({ class_id: classId, user_id: studentId })

            if (error) throw error

            return NextResponse.json({ success: true, message: 'Student removed from class' })
        }

        if (action === 'deleteTaskBox') {
            if (!taskBoxId) {
                return NextResponse.json({ error: 'Missing taskBoxId' }, { status: 400 })
            }

            // Verify teacher owns the task box (via class)
            const { data: taskBox } = await supabase
                .from('task_boxes')
                .select('class_id, classes(teacher_id)')
                .eq('id', taskBoxId)
                .single()

            if (!taskBox || (taskBox.classes as any)?.teacher_id !== session.user.id) {
                return NextResponse.json({ error: 'Forbidden: You do not own this task box' }, { status: 403 })
            }

            // Get works to delete images from storage
            const { data: works } = await supabaseAdmin
                .from('works')
                .select('image_url')
                .eq('task_box_id', taskBoxId)

            if (works && works.length > 0) {
                const pathsToDelete: string[] = []
                works.forEach(work => {
                    // Extract path from URL. Assuming standard Supabase storage URL format.
                    // e.g., .../storage/v1/object/public/works/user_id/filename
                    const parts = work.image_url.split('/works/')
                    if (parts.length > 1) {
                        pathsToDelete.push(parts[1])
                    }
                })

                if (pathsToDelete.length > 0) {
                    const { error: storageError } = await supabaseAdmin.storage
                        .from('works')
                        .remove(pathsToDelete)

                    if (storageError) {
                        console.error('Error deleting images:', storageError)
                        // Continue to delete records even if storage cleanup fails partially
                    }
                }
            }

            // Delete Task Box (Cascade deletes works, comments, etc.)
            const { error } = await supabaseAdmin
                .from('task_boxes')
                .delete()
                .eq('id', taskBoxId)

            if (error) throw error

            return NextResponse.json({ success: true, message: 'Task box deleted successfully' })
        }

        if (action === 'updateTaskBox') {
            if (!taskBoxId) {
                return NextResponse.json({ error: 'Missing taskBoxId' }, { status: 400 })
            }

            // Verify teacher owns the task box
            const { data: taskBox } = await supabase
                .from('task_boxes')
                .select('class_id, classes(teacher_id)')
                .eq('id', taskBoxId)
                .single()

            if (!taskBox || (taskBox.classes as any)?.teacher_id !== session.user.id) {
                return NextResponse.json({ error: 'Forbidden: You do not own this task box' }, { status: 403 })
            }

            const updates: any = {}
            if (unitName) updates.unit_name = unitName
            if (taskName) updates.task_name = taskName
            if (dueDate !== undefined) updates.due_date = dueDate // Allow null

            const { error } = await supabaseAdmin
                .from('task_boxes')
                .update(updates)
                .eq('id', taskBoxId)

            if (error) throw error

            return NextResponse.json({ success: true, message: 'Task box updated successfully' })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

    } catch (error: any) {
        console.error('Admin API Error:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
