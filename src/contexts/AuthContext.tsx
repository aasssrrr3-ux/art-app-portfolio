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
        // Get initial session
        // This is the source of truth for the initial loading state
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            if (session?.user) {
                // If we have a session, we must fetch the user details
                fetchUser(session.user.id, session)
            } else {
                // Truly no session, stop loading
                console.log('[Auth] No session found, stopping loading')
                setLoading(false)
            }
        }).catch(err => {
            console.error('[Auth] Initial session error:', err)
            setLoading(false)
        })

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log(`[Auth] Auth state changed: ${event}`)
                setSession(session)

                // SPECIAL HANDLING:
                // 'INITIAL_SESSION' is fired immediately by Supabase client.
                // We MUST ignore it for 'loading' state because getSession() above is handling the initial check.
                // If we set loading=false here when session is null (which it is for INITIAL_SESSION often),
                // we race with getSession() and cause premature redirects.
                if (event === 'INITIAL_SESSION') {
                    return
                }

                if (session?.user) {
                    await fetchUser(session.user.id, session)
                } else if (event === 'SIGNED_OUT') {
                    setUser(null)
                    setLoading(false)
                }
            }
        )

        return () => {
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
                setUser({
                    id: currentSession.user.id,
                    email: currentSession.user.email || '',
                    name: metadata.name || 'Unknown',
                    role: metadata.role,
                    created_at: currentSession.user.created_at
                })
                // We can't set loading=false here comfortably because we still want to fetch fresh data,
                // BUT if we want UI to be snappy, we could. 
                // However, let's wait for DB to be sure unless we want Stale-While-Revalidate.
                // For now, let's actually allow optimistic rendering if we have data.
            }
        } catch (e) {
            console.error('[Auth] Optimistic update error:', e)
        }

        // 2. Fetch from DB to get latest data (async)
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single()

            if (!error && data) {
                setUser(data)
            } else if (error) {
                console.warn('[Auth] DB fetch failed:', error.message)
            }

        } catch (error: any) {
            console.error('[Auth] Error in fetchUser DB call:', error)
        } finally {
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
