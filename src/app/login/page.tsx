'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { ChevronLeft, Mail, Lock, LogIn } from 'lucide-react'
import Link from 'next/link'

function LoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { signIn, user, loading } = useAuth()

    const role = searchParams.get('role') || 'student'
    const isTeacher = role === 'teacher'

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (!loading && user) {
            if (user.role === 'teacher') {
                router.push('/teacher/home')
            } else {
                router.push('/student/home')
            }
        }
    }, [user, loading, router])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setIsLoading(true)

        try {
            const { error } = await signIn(email, password)
            if (error) {
                setError('メールアドレスまたはパスワードが正しくありません')
            }
        } catch (err) {
            setError('ログインに失敗しました')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="page-header mb-8">
                    <Link href="/" className="back-button">
                        <ChevronLeft className="w-6 h-6 text-slate-600" />
                    </Link>
                    <div>
                        <p className="page-subtitle">
                            {isTeacher ? 'TEACHER LOGIN' : 'STUDENT LOGIN'}
                        </p>
                        <h1 className="page-title">
                            {isTeacher ? '先生ログイン' : '生徒ログイン'}
                        </h1>
                    </div>
                </div>

                {/* Login Form */}
                <div className="card-soft p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                メールアドレス
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-4 pl-14 border-2 border-slate-200 rounded-xl text-base bg-white focus:outline-none focus:border-[#5b5fff] focus:ring-4 focus:ring-[#5b5fff]/10 transition"
                                    placeholder={isTeacher ? 'teacher@test.com' : 'student01@example.com'}
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                パスワード
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-4 pl-14 border-2 border-slate-200 rounded-xl text-base bg-white focus:outline-none focus:border-[#5b5fff] focus:ring-4 focus:ring-[#5b5fff]/10 transition"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn-primary w-full flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <LogIn className="w-5 h-5" />
                                    ログイン
                                </>
                            )}
                        </button>
                    </form>

                    {/* Test Account Info */}
                    <div className="mt-6 p-4 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                            テストアカウント
                        </p>
                        <p className="text-sm text-slate-700">
                            {isTeacher ? (
                                <>
                                    Email: <code className="bg-slate-200 px-1 rounded">teacher@test.com</code><br />
                                    Pass: <code className="bg-slate-200 px-1 rounded">teacher123</code>
                                </>
                            ) : (
                                <>
                                    Email: <code className="bg-slate-200 px-1 rounded">student01@example.com</code><br />
                                    Pass: <code className="bg-slate-200 px-1 rounded">student123</code>
                                </>
                            )}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-[#5b5fff] border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <LoginForm />
        </Suspense>
    )
}
