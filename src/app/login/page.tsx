'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { ChevronLeft, Mail, Lock, LogIn, UserPlus, Key } from 'lucide-react'
import Link from 'next/link'

function LoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { signIn, signUp, user, loading } = useAuth()

    const role = searchParams.get('role') || 'student'
    const isTeacher = role === 'teacher'

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [name, setName] = useState('') // For signup
    const [secretCode, setSecretCode] = useState('') // For teacher signup
    const [isLoginMode, setIsLoginMode] = useState(true) // Switch between login and signup
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
            if (isLoginMode) {
                // Login
                const { error } = await signIn(email, password)
                if (error) {
                    setError('メールアドレスまたはパスワードが正しくありません')
                }
            } else {
                // Signup
                if (isTeacher) {
                    // Check Secret Code
                    const correctCode = process.env.NEXT_PUBLIC_TEACHER_SECRET_CODE
                    if (!correctCode || secretCode !== correctCode) {
                        throw new Error('合言葉が間違っています')
                    }
                }

                const { error } = await signUp(email, password, name, role)
                if (error) {
                    throw error
                }
                // Successful signup will auto-login via AuthContext
            }
        } catch (err: any) {
            setError(err.message || 'エラーが発生しました')
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
                            {isTeacher ? 'TEACHER ACCESS' : 'STUDENT ACCESS'}
                        </p>
                        <h1 className="page-title">
                            {isTeacher ? (isLoginMode ? '先生ログイン' : '先生アカウント作成') : '生徒ログイン'}
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

                        {/* Signup Fields */}
                        {!isLoginMode && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        お名前
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full px-4 py-4 border-2 border-slate-200 rounded-xl text-base bg-white focus:outline-none focus:border-[#5b5fff] focus:ring-4 focus:ring-[#5b5fff]/10 transition"
                                            placeholder="山田 太郎"
                                            required={!isLoginMode}
                                        />
                                    </div>
                                </div>

                                {isTeacher && (
                                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                                        <label className="block text-sm font-bold text-amber-800 mb-2 flex items-center gap-2">
                                            <Key className="w-4 h-4" />
                                            先生用の合言葉
                                        </label>
                                        <input
                                            type="text"
                                            value={secretCode}
                                            onChange={(e) => setSecretCode(e.target.value)}
                                            className="w-full px-4 py-4 border-2 border-amber-200 rounded-lg text-base bg-white focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 transition"
                                            placeholder="学校で共有された合言葉を入力"
                                            required={!isLoginMode && isTeacher}
                                        />
                                        <p className="text-xs text-amber-600 mt-2">
                                            ※先生アカウントを勝手に作成されないよう、合言葉が必要です。
                                        </p>
                                    </div>
                                )}
                            </>
                        )}

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
                                    {isLoginMode ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                                    {isLoginMode ? 'ログイン' : 'アカウント作成'}
                                </>
                            )}
                        </button>

                        {/* Switch Mode Button */}
                        {isTeacher && (
                            <div className="text-center pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsLoginMode(!isLoginMode)
                                        setError('')
                                        setSecretCode('')
                                    }}
                                    className="text-sm text-[#5b5fff] hover:underline"
                                >
                                    {isLoginMode ? 'アカウントを新規作成する' : 'ログインに戻る'}
                                </button>
                            </div>
                        )}
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
