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
        try {
            // Attempt to fetch from public.users
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single()

            console.log('[Auth] User fetch result:', { data, error })

            if (error) {
                console.error('[Auth] User fetch error:', error)
                throw error
            }

            if (data) {
                setUser(data)
            }
        } catch (error: any) {
            console.error('[Auth] Error fetching user from DB, trying fallback:', error)

            // FALLBACK: Try to construct user from session metadata
            // This ensures login works even if public.users is inaccessible (RLS/DB issues)
            const currentSession = await supabase.auth.getSession()
            const authUser = currentSession.data.session?.user

            if (authUser && authUser.id === userId) {
                const metadata = authUser.user_metadata
                if (metadata && metadata.role) {
                    console.warn('[Auth] Using metadata fallback for user data')
                    setUser({
                        id: authUser.id,
                        email: authUser.email || '',
                        name: metadata.name || 'Unknown',
                        role: metadata.role,
                        created_at: authUser.created_at
                    })
                } else {
                    setUser(null)
                }
            } else {
                setUser(null)
            }
        } finally {
            console.log('[Auth] Setting loading to false')
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
