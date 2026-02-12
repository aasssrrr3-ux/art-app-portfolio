'use client'

import React from 'react'
import Link from 'next/link'
import { Home, Settings } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

export default function TeacherLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter()

    return (
        <div className="theme-teacher min-h-screen bg-[#f0f9ff] text-slate-900 pb-20 md:pb-0 relative">
            {/* Desktop Header Actions (Home & Logout) */}
            {/* Desktop Header Actions (Badge, Home, Logout) */}
            <div className="fixed top-4 right-4 z-[100] flex items-center gap-4">
                {/* Badge */}
                <div className="bg-amber-100 text-amber-900 border border-amber-200 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm whitespace-nowrap">
                    先生モード
                </div>

                {/* Home Button */}
                <Link
                    href="/teacher/home"
                    className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-full shadow-sm flex items-center justify-center hover:bg-slate-50 transition"
                    title="ホーム"
                >
                    <Home className="w-5 h-5 md:w-6 md:h-6 text-black" strokeWidth={4} />
                </Link>

                {/* Settings Button (Logout moved inside) */}
                <Link
                    href="/teacher/settings"
                    className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-full shadow-sm flex items-center justify-center hover:bg-slate-50 transition"
                    title="設定"
                >
                    <Settings className="w-5 h-5 md:w-6 md:h-6 text-black" strokeWidth={4} />
                </Link>
            </div>

            {children}

            {/* Fixed Bottom Navigation for Mobile / Floating for Desktop */}

        </div>
    )
}
