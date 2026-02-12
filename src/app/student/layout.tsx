'use client'

import React from 'react'
import Link from 'next/link'
import { Home, Settings } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

export default function StudentLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter()

    return (
        <div className="theme-student min-h-screen bg-[#fafafa] pb-20 md:pb-0 relative">
            {/* Mode Badge */}
            {/* Desktop Header Actions (Badge, Home, Logout) */}
            <div className="fixed top-4 right-4 z-[100] flex items-center gap-4">
                {/* Badge */}
                <div className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm whitespace-nowrap">
                    生徒モード
                </div>

                {/* Home Button */}
                <Link
                    href="/student/home"
                    className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-full shadow-sm flex items-center justify-center hover:bg-slate-50 transition"
                    title="ホーム"
                >
                    <Home className="w-5 h-5 md:w-6 md:h-6 text-black" strokeWidth={4} />
                </Link>

                {/* Settings Button (Logout moved inside) */}
                <Link
                    href="/student/settings"
                    className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-full shadow-sm flex items-center justify-center hover:bg-slate-50 transition"
                    title="設定"
                >
                    <Settings className="w-5 h-5 md:w-6 md:h-6 text-black" strokeWidth={4} />
                </Link>
            </div>
            {children}
        </div>
    )
}
