'use client'

import React from 'react'
import Link from 'next/link'
import { Home, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

export default function TeacherLayout({
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
        <div className="theme-teacher min-h-screen bg-[#0f172a] text-slate-100 pb-20 md:pb-0 relative">
            {/* Mode Badge */}
            <div className="fixed top-4 right-4 z-50 bg-amber-500 text-[#0f172a] px-3 py-1 rounded-full text-xs font-bold shadow-lg border border-amber-400">
                [先生モード]
            </div>
            {children}

            {/* Fixed Bottom Navigation for Mobile / Floating for Desktop */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 md:top-0 md:bottom-auto md:border-t-0 md:bg-transparent md:pointer-events-none z-50">
                <div className="max-w-4xl mx-auto flex items-center justify-between md:justify-end md:gap-4 pointer-events-auto">
                    {/* Mobile Only: Home */}
                    <Link href="/teacher/home" className="flex flex-col items-center gap-1 text-slate-500 hover:text-[#0d9488] md:hidden">
                        <Home className="w-6 h-6" />
                        <span className="text-[10px] font-bold">ホーム</span>
                    </Link>

                    {/* Desktop: Home */}
                    <Link href="/teacher/home" className="hidden md:flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-lg text-slate-500 hover:text-[#0d9488] transition">
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
