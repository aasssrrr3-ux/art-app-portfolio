'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase, User, Role } from '@/lib/supabase'
import { Session } from '@supabase/supabase-js'

interface AuthContextType {
    session: Session | null
    user: User | null
    loading: boolean
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>
    signUp: (email: string, password: string, name: string, role: string) => Promise<{ error: Error | null }>
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null)
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Start a fallback timer to force loading to false if Supabase hangs
        // Start a fallback timer to force loading to false if Supabase hangs
        const timer = setTimeout(async () => {
            console.warn('[Auth] Loading took too long, forcing logic')

            // Try to recover from session if available
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.user?.user_metadata?.role) {
                console.warn('[Auth] Recovering user from session metadata due to timeout')
                setUser({
                    id: session.user.id,
                    email: session.user.email || '',
                    name: session.user.user_metadata.name || 'Unknown',
                    role: session.user.user_metadata.role,
                    created_at: session.user.created_at
                })
            }

            setLoading(false)
        }, 5000) // 5 seconds timeout

        // Get initial session
        console.log('[Auth] Calling supabase.auth.getSession()...')
        supabase.auth.getSession().then(({ data: { session } }) => {
            console.log('[Auth] getSession finished', { hasSession: !!session })
            clearTimeout(timer)
            setSession(session)
            if (session?.user) {
                fetchUser(session.user.id)
            } else {
                setLoading(false)
            }
        }).catch(err => {
            clearTimeout(timer)
            // Ignore AbortError which can happen on fast navigations/strict mode
            if (err.name === 'AbortError' || err.message?.includes('aborted')) {
                console.warn('[Auth] Session fetch aborted')
            } else {
                console.error('[Auth] Initial session error:', err)
            }
            setLoading(false)
        })

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('[Auth] Auth state changed:', event, session?.user?.email)
                setSession(session)
                if (session?.user) {
                    await fetchUser(session.user.id)
                } else {
                    setUser(null)
                    setLoading(false)
                }
            }
        )

        return () => {
            clearTimeout(timer)
            subscription.unsubscribe()
        }
    }, [])

    const fetchUser = async (userId: string) => {
        console.log('[Auth] Fetching user:', userId)

        // 1. Optimistic Update from Session Metadata (Immediate)
        // This ensures the user is "logged in" even if the DB call below hangs/fails.
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.user && session.user.id === userId) {
                const metadata = session.user.user_metadata
                if (metadata && metadata.role) {
                    const optimisticUser = {
                        id: session.user.id,
                        email: session.user.email || '',
                        name: metadata.name || 'Unknown',
                        role: metadata.role,
                        created_at: session.user.created_at
                    }
                    console.log('[Auth] Optimistically setting user from metadata')
                    setUser(optimisticUser)
                    // If we have data, we can stop loading tentatively
                    setLoading(false)
                }
            }
        } catch (e) {
            console.error('[Auth] Error getting session for optimistic update:', e)
        }

        // 2. Fetch from DB to get latest data (async)
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single()

            if (!error && data) {
                console.log('[Auth] Loaded fresh user data from DB')
                setUser(data)
            } else if (error) {
                console.warn('[Auth] DB fetch failed, keeping metadata user:', error.message)
            }

        } catch (error: any) {
            console.error('[Auth] Error in fetchUser DB call:', error)
        } finally {
            console.log('[Auth] Fetch process finished')
            setLoading(false)
        }
    }

    const signIn = async (email: string, password: string) => {
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })
            if (error) throw error
            return { error: null }
        } catch (error) {
            return { error: error as Error }
        }
    }

    const signUp = async (email: string, password: string, name: string, role: string) => {
        try {
            // 1. SignUp with Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
            })
            if (authError) throw authError

            if (authData.user) {
                // 2. Create Public User Record
                const { error: dbError } = await supabase
                    .from('users')
                    .insert({
                        id: authData.user.id,
                        email,
                        name,
                        role
                    })

                if (dbError) throw dbError

                // Fetch user data to update context state immediately
                await fetchUser(authData.user.id)
            }

            return { error: null }
        } catch (error) {
            console.error('SignUp Error:', error)
            return { error: error as Error }
        }
    }


    const signOut = async () => {
        await supabase.auth.signOut()
        setUser(null)
        setSession(null)
    }

    return (
        <AuthContext.Provider value={{ session, user, loading, signIn, signUp, signOut }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
