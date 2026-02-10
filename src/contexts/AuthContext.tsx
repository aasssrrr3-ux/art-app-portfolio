'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase, AppUser, Role } from '@/lib/supabase'
import { Session, User } from '@supabase/supabase-js'

interface AuthContextType {
    session: Session | null
    user: AppUser | null
    loading: boolean
    signIn: (email: string, password: string) => Promise<{ data: { user: User | null; session: Session | null }; error: Error | null }>
    signUp: (email: string, password: string, name: string, role: string) => Promise<{ error: Error | null }>
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null)
    const [user, setUser] = useState<AppUser | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let mounted = true

        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!mounted) return
            setSession(session)
            if (session?.user) {
                fetchUser(session.user.id, session)
            } else {
                setLoading(false)
            }
        }).catch(err => {
            if (!mounted) return
            setLoading(false)
        })

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!mounted) return
                setSession(session)

                if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                    if (session?.user) {
                        await fetchUser(session.user.id, session)
                    }
                } else if (event === 'SIGNED_OUT') {
                    setUser(null)
                    setLoading(false)
                } else if (event === 'INITIAL_SESSION') {
                    // Handle initial load completion if getSession hasn't already
                    if (!session) {
                        setLoading(false)
                    }
                }
            }
        )

        return () => {
            mounted = false
            subscription.unsubscribe()
        }
    }, [])

    const fetchUser = async (userId: string, existingSession?: Session | null) => {
        // 1. Optimistic Update from Session Metadata (Immediate)
        try {
            let currentSession = existingSession
            if (!currentSession) {
                const { data } = await supabase.auth.getSession()
                currentSession = data.session
            }

            if (currentSession?.user && currentSession.user.user_metadata?.role) {
                const metadata = currentSession.user.user_metadata
                // Ensure the object matches AppUser interface
                setUser({
                    id: currentSession.user.id,
                    email: currentSession.user.email || '',
                    name: metadata.name || 'Unknown',
                    role: metadata.role as Role,
                    created_at: currentSession.user.created_at
                })
            }
        } catch (e) {
            // silent fail for optimistic update
        }

        // 2. Fetch from DB to get latest data (async)
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single()

            if (!error && data) {
                setUser(data as AppUser)
            }
        } catch (error: any) {
            // silent fail
        } finally {
            setLoading(false)
        }
    }

    const signIn = async (email: string, password: string) => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })
            if (error) throw error
            return { data: { user: data.user, session: data.session }, error: null }
        } catch (error) {
            return { data: { user: null, session: null }, error: error as Error }
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
                await fetchUser(authData.user.id, authData.session)
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
