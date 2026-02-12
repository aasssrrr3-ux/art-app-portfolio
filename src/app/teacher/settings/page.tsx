'use client'

import React from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import SettingsForm from '@/components/SettingsForm'

export default function TeacherSettingsPage() {
    return (
        <div className="min-h-screen pt-24 px-4 pb-4 md:pt-24 md:px-8 md:pb-8">
            {/* Header */}
            <div className="page-header mb-8">
                <Link href="/teacher/home" className="back-button">
                    <ChevronLeft className="w-6 h-6 text-black" strokeWidth={4} />
                </Link>
                <div>
                    <p className="page-subtitle">ACCOUNT SETTINGS</p>
                    <h1 className="page-title">設定</h1>
                </div>
            </div>

            <SettingsForm role="teacher" />

            {/* Footer */}
            <p className="text-center text-slate-400 text-xs uppercase tracking-widest mt-12 mb-20">
                TEACHER MANAGEMENT SYSTEM
            </p>
        </div>
    )
}
