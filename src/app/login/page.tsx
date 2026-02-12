'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { ChevronLeft, Mail, Lock, LogIn, UserPlus, Key, Eye, EyeOff, Check } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

function LoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { signIn, signUp, user, loading } = useAuth()

    const role = searchParams.get('role') || 'student'
    const isTeacher = role === 'teacher'

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('') // New
    const [name, setName] = useState('')
    const [secretCode, setSecretCode] = useState('')
    const [isLoginMode, setIsLoginMode] = useState(true)
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    // Visibility Toggles
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    // Validation Logic
    const isValidLength = password.length >= 12
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumber = /[0-9]/.test(password)
    const isMetRequirements = isValidLength && hasUpperCase && hasLowerCase && hasNumber
    const isMatching = password === confirmPassword

    // Validation applies only in Signup mode
    const canSubmit = isLoginMode
        ? true
        : (isMetRequirements && isMatching && confirmPassword !== '')

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

        if (!isLoginMode && !canSubmit) {
            setError('パスワードの要件を満たしていないか、一致していません')
            return
        }

        setIsLoading(true)

        try {
            if (isLoginMode) {
                // --- ログイン処理 ---
                const { data, error: signInError } = await signIn(email, password)
                if (signInError) {
                    setError('メールアドレスまたはパスワードが正しくありません')
                    setIsLoading(false)
                    return
                }

                // ロールに基づいたリダイレクト
                if (data?.user) {
                    let userRole = data.user.user_metadata?.role
                    if (!userRole) {
                        const { data: dbData } = await supabase
                            .from('users')
                            .select('role')
                            .eq('id', data.user.id)
                            .single()
                        if (dbData) userRole = dbData.role
                    }

                    if (userRole === 'student') {
                        router.push('/student/home')
                        return
                    } else if (userRole === 'teacher') {
                        router.push('/teacher/home')
                        return
                    }
                }
            } else {
                // --- アカウント作成（サインアップ）処理 ---
                if (isTeacher) {
                    // 環境変数の合言葉と照合
                    const correctWord = process.env.NEXT_PUBLIC_TEACHER_SECRET_WORD
                    if (!correctWord || secretCode !== correctWord) {
                        throw new Error('合言葉が正しくありません。正しい合言葉を入力してください。')
                    }
                }

                const { error: signUpError } = await signUp(email, password, name, role)
                if (signUpError) throw signUpError
            }
        } catch (err: any) {
            setError(err.message || 'エラーが発生しました')
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50">
            <div className="w-full max-w-md">
                <div className="page-header mb-8 flex items-center gap-4">
                    <Link href="/" className="p-2 hover:bg-slate-100 rounded-full transition">
                        <ChevronLeft className="w-6 h-6 text-black" strokeWidth={4} />
                    </Link>
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                            {isTeacher ? 'TEACHER ACCESS' : 'STUDENT ACCESS'}
                        </p>
                        <h1 className="text-2xl font-black text-black">
                            {isTeacher ? (isLoginMode ? '先生ログイン' : '先生アカウント作成') : '生徒ログイン'}
                        </h1>
                    </div>
                </div>

                <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-black text-black mb-2">メールアドレス</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black" strokeWidth={4} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-4 pl-14 border-4 border-black text-lg focus:outline-none focus:bg-slate-50 transition"
                                    placeholder="example@mail.com"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-black text-black mb-2">パスワード</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black" strokeWidth={4} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-4 pl-14 border-4 border-black text-lg focus:outline-none focus:bg-slate-50 transition"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-black transition"
                                >
                                    {showPassword ? <EyeOff size={24} strokeWidth={4} /> : <Eye size={24} strokeWidth={4} />}
                                </button>
                            </div>
                        </div>

                        {!isLoginMode && (
                            <>
                                {/* Confirm Password */}
                                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                    <label className="block text-sm font-black text-black mb-2">パスワード（確認）</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black" strokeWidth={4} />
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full px-4 py-4 pl-14 border-4 border-black text-lg focus:outline-none focus:bg-slate-50 transition"
                                            placeholder="もう一度入力"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-black transition"
                                        >
                                            {showConfirmPassword ? <EyeOff size={24} strokeWidth={4} /> : <Eye size={24} strokeWidth={4} />}
                                        </button>
                                    </div>
                                    {!isMatching && confirmPassword && (
                                        <div className="mt-2 p-2 bg-red-50 border-2 border-black text-black text-xs font-black flex items-center gap-2">
                                            パスワードが一致しません
                                        </div>
                                    )}
                                </div>

                                {/* Validation Indicators */}
                                <div className="space-y-1 pl-1 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <p className={`text-xs font-bold flex items-center gap-1 ${isValidLength ? 'text-green-600' : 'text-slate-400'}`}>
                                        <Check size={12} strokeWidth={4} className={isValidLength ? 'opacity-100' : 'opacity-0'} />
                                        12文字以上
                                    </p>
                                    <p className={`text-xs font-bold flex items-center gap-1 ${hasUpperCase ? 'text-green-600' : 'text-slate-400'}`}>
                                        <Check size={12} strokeWidth={4} className={hasUpperCase ? 'opacity-100' : 'opacity-0'} />
                                        大文字を含む (A-Z)
                                    </p>
                                    <p className={`text-xs font-bold flex items-center gap-1 ${hasLowerCase ? 'text-green-600' : 'text-slate-400'}`}>
                                        <Check size={12} strokeWidth={4} className={hasLowerCase ? 'opacity-100' : 'opacity-0'} />
                                        小文字を含む (a-z)
                                    </p>
                                    <p className={`text-xs font-bold flex items-center gap-1 ${hasNumber ? 'text-green-600' : 'text-slate-400'}`}>
                                        <Check size={12} strokeWidth={4} className={hasNumber ? 'opacity-100' : 'opacity-0'} />
                                        数字を含む (0-9)
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-black text-black mb-2">お名前</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full px-4 py-4 border-4 border-black text-lg focus:outline-none"
                                        placeholder="山田 太郎"
                                        required
                                    />
                                </div>
                                {isTeacher && (
                                    <div className="bg-yellow-100 p-4 border-4 border-black">
                                        <label className="block text-sm font-black text-black mb-2 flex items-center gap-2">
                                            <Key className="w-4 h-4 text-black" strokeWidth={4} />
                                            先生用の合言葉
                                        </label>
                                        <input
                                            type="text"
                                            value={secretCode}
                                            onChange={(e) => setSecretCode(e.target.value)}
                                            className="w-full px-4 py-3 border-4 border-black text-base focus:outline-none"
                                            placeholder="合言葉を入力"
                                            required
                                        />
                                    </div>
                                )}
                            </>
                        )}

                        {error && (
                            <div className="p-4 bg-red-50 border-4 border-black text-black font-black text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading || (!isLoginMode && !canSubmit)}
                            className={`w-full py-4 text-xl font-black transition flex items-center justify-center gap-2 border-4 border-black ${isLoading || (!isLoginMode && !canSubmit)
                                ? 'bg-slate-300 cursor-not-allowed text-slate-500 border-slate-400'
                                : (isLoginMode ? 'bg-black text-white' : 'bg-white text-black')
                                }`}
                        >
                            {isLoading ? (
                                <div className="w-6 h-6 border-4 border-black border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    {isLoginMode ? <LogIn className="w-6 h-6" strokeWidth={4} /> : <UserPlus className="w-6 h-6" strokeWidth={4} />}
                                    {isLoginMode ? '【ログイン】実行' : '【新規アカウント作成】実行'}
                                </>
                            )}
                        </button>

                        {isTeacher && (
                            <div className="text-center pt-4 border-t-4 border-black">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsLoginMode(!isLoginMode)
                                        setError('')
                                        setPassword('')
                                        setConfirmPassword('')
                                    }}
                                    className="text-sm font-black text-black underline decoration-2"
                                >
                                    {isLoginMode ? 'アカウントを新規作成する' : 'ログインに戻る'}
                                </button>
                            </div>
                        )}
                    </form>

                    <div className="mt-6 text-center">
                        <Link href="/forgot-password" title="Forgot Password" className="text-black underline decoration-4 font-black text-sm hover:bg-black hover:text-white transition px-2 py-1">
                            パスワードを忘れた方はこちら
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-black">LOADING...</div>}>
            <LoginForm />
        </Suspense>
    )
}