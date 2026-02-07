'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase, User, Role } from '@/lib/supabase'
import { Session } from '@supabase/supabase-js'

interface AuthContextType {
    session: Session | null
    user: User | null
    loading: boolean
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null)
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            if (session?.user) {
                fetchUser(session.user.id)
            } else {
                setLoading(false)
            }
        })

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                setSession(session)
                if (session?.user) {
                    await fetchUser(session.user.id)
                } else {
                    setUser(null)
                    setLoading(false)
                }
            }
        )

        return () => subscription.unsubscribe()
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
        } catch (error) {
            console.error('[Auth] Error fetching user:', error)
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

    const signOut = async () => {
        await supabase.auth.signOut()
        setUser(null)
        setSession(null)
    }

    return (
        <AuthContext.Provider value={{ session, user, loading, signIn, signOut }}>
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
