'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
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
    const router = useRouter()
    const [session, setSession] = useState<Session | null>(null)
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            if (session?.user) {
                fetchUser(session.user.id, session)
            } else {
                setLoading(false)
            }
        }).catch(err => {
            setLoading(false)
        })

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                setSession(session)

                // LOGIN LOGIC REFINEMENT: Role-based redirect & Safety Net
                if (event === 'SIGNED_IN') {
                    const role = session?.user?.user_metadata?.role
                    let target = '/'

                    if (role === 'student') target = '/student/home'
                    else if (role === 'teacher') target = '/teacher/home'

                    console.log(`[Auth] Role: ${role}, Redirecting to: ${target}`)
                    router.push(target)

                    // Safety Valve: Force loading end in 2s
                    setTimeout(() => {
                        setLoading(false)
                    }, 2000)
                }

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
    }, [router])

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
                setUser(data)
            }
        } catch (error: any) {
            // silent fail
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
