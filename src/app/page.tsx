'use client'

import { useRouter } from 'next/navigation'
import { GraduationCap, Users } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useEffect } from 'react'

export default function HomePage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'teacher') {
        router.push('/teacher/home')
      } else if (user.role === 'student') {
        router.push('/student/home')
      }
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#5b5fff] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="text-center mb-12">
        <p className="page-subtitle mb-2">ART EDUCATION SYSTEM</p>
        <h1 className="text-4xl font-bold text-slate-900 mb-4">
          美術授業支援アプリ
        </h1>
        <p className="text-slate-600">
          どちらのアカウントでログインしますか？
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl">
        {/* Teacher Card */}
        <button
          onClick={() => router.push('/login?role=teacher')}
          className="menu-card group"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#5b5fff] to-[#8b5cf6] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">先生</h2>
          <p className="text-sm text-slate-500 uppercase tracking-wider">
            TEACHER
          </p>
        </button>

        {/* Student Card */}
        <button
          onClick={() => router.push('/login?role=student')}
          className="menu-card group"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#22c55e] to-[#10b981] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Users className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">生徒</h2>
          <p className="text-sm text-slate-500 uppercase tracking-wider">
            STUDENT
          </p>
        </button>
      </div>

      <p className="text-slate-400 text-sm mt-16 tracking-widest">
        PROCESS PORTFOLIO PLATFORM
      </p>
    </div>
  )
}
