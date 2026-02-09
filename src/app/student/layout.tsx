'use client'

import React from 'react'
import Link from 'next/link'
import { Home, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

export default function StudentLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { signOut } = useAuth()
    const router = useRouter()

    const handleSignOut = async () => {
        await signOut()
        router.push('/')
    }

    return (
        <div className="theme-student min-h-screen bg-slate-50 pb-20 md:pb-0">
            {children}

            {/* Fixed Bottom Navigation for Mobile / Floating for Desktop */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 md:top-0 md:bottom-auto md:border-t-0 md:bg-transparent md:pointer-events-none z-50">
                <div className="max-w-4xl mx-auto flex items-center justify-between md:justify-end md:gap-4 pointer-events-auto">
                    {/* Mobile Only: Home */}
                    <Link href="/student/home" className="flex flex-col items-center gap-1 text-slate-500 hover:text-[#5b5fff] md:hidden">
                        <Home className="w-6 h-6" />
                        <span className="text-[10px] font-bold">ホーム</span>
                    </Link>

                    {/* Desktop: Home (Often provided in page header, but good to have fallback/utility) */}
                    <Link href="/student/home" className="hidden md:flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-lg text-slate-500 hover:text-[#5b5fff] transition">
                        <Home className="w-6 h-6" />
                    </Link>

                    {/* Logout Button */}
                    <button
                        onClick={handleSignOut}
                        className="flex flex-col items-center gap-1 text-slate-500 hover:text-red-500 md:hidden"
                    >
                        <LogOut className="w-6 h-6" />
                        <span className="text-[10px] font-bold">ログアウト</span>
                    </button>

                    <button
                        onClick={handleSignOut}
                        className="hidden md:flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-lg text-slate-500 hover:text-red-500 transition"
                        title="ログアウト"
                    >
                        <LogOut className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </div>
    )
}
