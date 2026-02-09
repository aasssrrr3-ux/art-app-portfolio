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
        const timer = setTimeout(() => {
            console.warn('[Auth] Loading took too long, forcing completion')
            setLoading(false)
        }, 5000) // 5 seconds timeout

        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            if (session?.user) {
                fetchUser(session.user.id)
            } else {
                setLoading(false)
            }
        }).catch(err => {
            console.error('[Auth] Initial session error:', err)
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
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single()

            console.log('[Auth] User fetch result:', { data, error })

            if (error) {
                console.error('[Auth] User fetch error:', error)
                // User might exist in auth but not in public.users
                // This can happen with Excel import
                setUser(null)
            } else {
                setUser(data)
            }
        } catch (error: any) {
            console.error('[Auth] Error fetching user:', error)
            console.error('[Auth] Error details:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            })
            setUser(null)
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
