import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

interface StudentData {
    email: string
    name: string
    number: number
}

export async function POST(request: NextRequest) {
    // Service Role Client for admin operations - Initialize inside handler
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
        const { students, classId } = await request.json() as {
            students: StudentData[]
            classId: string
        }

        if (!students || !classId) {
            return NextResponse.json({ error: 'Missing required data' }, { status: 400 })
        }

        let successCount = 0
        let errorCount = 0
        const errors: string[] = []

        const createdUsers: { name: string; email: string; password: string; number: number }[] = []

        for (const student of students) {
            try {
                // Check if user already exists in public.users
                const { data: existingUser } = await supabaseAdmin
                    .from('users')
                    .select('id')
                    .eq('email', student.email)
                    .single()

                let userId: string
                let password = 'ExistingUser' // Placeholder for existing users

                if (existingUser) {
                    userId = existingUser.id
                    // Cannot retrieve password for existing user
                } else {
                    // Generate random 6-char password
                    const chars = 'abcdefghijkmnpqrstuvwxyz23456789' // Removed confusing chars like l, 1, o, 0
                    password = Array.from(crypto.getRandomValues(new Uint8Array(6)))
                        .map(b => chars[b % chars.length])
                        .join('')

                    // Create new auth user with admin API
                    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                        email: student.email,
                        password: password,
                        email_confirm: true, // Skip email confirmation
                        user_metadata: {
                            name: student.name,
                            role: 'student'
                        }
                    })

                    if (authError || !authData.user) {
                        console.error(`Error creating auth user ${student.email}:`, authError)
                        errors.push(`${student.name}: ${authError?.message || 'Auth creation failed'}`)
                        errorCount++
                        continue
                    }

                    userId = authData.user.id

                    // Create user profile in public.users
                    const { error: profileError } = await supabaseAdmin.from('users').insert({
                        id: userId,
                        email: student.email,
                        name: student.name,
                        role: 'student'
                    })

                    if (profileError) {
                        console.error(`Error creating profile for ${student.email}:`, profileError)
                        // Continue anyway, the auth user was created
                    }

                    // Add to created list only if it's a new user
                    createdUsers.push({
                        name: student.name,
                        email: student.email,
                        password: password,
                        number: student.number
                    })
                }

                // Add user to class
                const { error: memberError } = await supabaseAdmin.from('class_members').upsert({
                    class_id: classId,
                    user_id: userId,
                    student_number: student.number
                }, {
                    onConflict: 'class_id,user_id'
                })

                if (memberError) {
                    console.error(`Error adding ${student.email} to class:`, memberError)
                    errors.push(`${student.name}: クラス追加に失敗`)
                    errorCount++
                    continue
                }

                successCount++
            } catch (e: any) {
                console.error(`Error processing ${student.email}:`, e)
                errors.push(`${student.name}: ${e.message}`)
                errorCount++
            }
        }

        return NextResponse.json({
            success: true,
            successCount,
            errorCount,
            errors: errors.slice(0, 5), // Return first 5 errors only
            createdUsers // Return list of new users with passwords
        })

    } catch (error: any) {
        console.error('Import API error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
