import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    const logs: string[] = []
    const log = (msg: string) => logs.push(`[${new Date().toISOString()}] ${msg}`)

    // Create HTML helper
    const renderPage = (title: string, color: string, message: string) => {
        return new NextResponse(`
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="utf-8">
                <title>Debug: ${title}</title>
                <style>
                    body { font-family: system-ui, sans-serif; padding: 2rem; max-width: 800px; margin: 0 auto; background: #f8fafc; }
                    .card { background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
                    .status { font-weight: bold; font-size: 1.5rem; color: ${color}; margin-bottom: 1rem; }
                    .logs { background: #1e293b; color: #e2e8f0; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; font-family: monospace; white-space: pre-wrap; margin-top: 2rem; }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="status">${title}</div>
                    <p>${message}</p>
                    <div class="logs">${logs.join('\n')}</div>
                    <br>
                    <a href="/login">Return to Login Screen</a>
                </div>
            </body>
        </html>
        `, { headers: { 'Content-Type': 'text/html' } })
    }

    try {
        log('Starting Debug Process...')
        log(`Checking Environment Variables...`)
        log(`NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? 'OK' : 'MISSING'}`)
        log(`SUPABASE_SERVICE_ROLE_KEY: ${serviceRoleKey ? 'OK (Length: ' + serviceRoleKey.length + ')' : 'MISSING'}`)

        if (!supabaseUrl || !serviceRoleKey) {
            return renderPage('Configuration Error', 'red', 'Environment variables are missing on Vercel.')
        }

        // Service Role Client
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        })

        const email = 'student01@example.com'
        const password = 'student123'
        const name = 'テスト生徒'

        log(`Target User: ${email}`)

        // 1. Check if user exists
        log('Fetching user list...')
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()

        if (listError) {
            log(`Error listing users: ${listError.message}`)
            throw listError
        }

        const existingUser = users.find(u => u.email === email)
        let userId: string

        if (existingUser) {
            log(`User found (ID: ${existingUser.id}). Updating password...`)
            const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                existingUser.id,
                { password: password, user_metadata: { name, role: 'student' } }
            )
            if (updateError) throw updateError
            userId = existingUser.id
            log('Password updated successfully.')
        } else {
            log('User not found. Creating new user...')
            const { data, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { name, role: 'student' }
            })
            if (createError) throw createError
            userId = data.user.id
            log(`User created successfully (ID: ${userId}).`)
        }

        // 2. Ensure public.users entry exists
        log('Syncing to public.users table...')
        const { error: upsertError } = await supabaseAdmin
            .from('users')
            .upsert({
                id: userId,
                email,
                name,
                role: 'student'
            })

        if (upsertError) {
            log(`Error upserting profile: ${upsertError.message}`)
            throw upsertError
        }
        log('Profile synced successfully.')
        log('DONE. You should be able to login now.')

        return renderPage('Success', 'green', `User ${email} has been reset. Password is: <b>${password}</b>`)

    } catch (error: any) {
        log(`FATAL ERROR: ${error.message}`)
        return renderPage('Processing Error', 'red', `An error occurred: ${error.message}`)
    }
}
