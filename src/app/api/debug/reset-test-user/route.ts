import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    // Service Role Client
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

    try {
        const email = 'student01@example.com'
        const password = 'student123'
        const name = 'テスト生徒'

        // 1. Check if user exists
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()

        if (listError) throw listError

        const existingUser = users.find(u => u.email === email)

        let userId: string

        if (existingUser) {
            // Update password
            const { data, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                existingUser.id,
                { password: password }
            )
            if (updateError) throw updateError
            userId = existingUser.id
            console.log('Updated existing user password')
        } else {
            // Create user
            const { data, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { name, role: 'student' }
            })
            if (createError) throw createError
            userId = data.user.id
            console.log('Created new user')
        }

        // 2. Ensure public.users entry exists
        const { error: upsertError } = await supabaseAdmin
            .from('users')
            .upsert({
                id: userId,
                email,
                name,
                role: 'student'
            })

        if (upsertError) throw upsertError

        return NextResponse.json({
            success: true,
            message: `User ${email} reset successfully with password ${password}`
        })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
