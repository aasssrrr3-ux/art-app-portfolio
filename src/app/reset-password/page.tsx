'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Key, Check, ChevronLeft, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

export default function ResetPasswordPage() {
    // const router = useRouter()

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')
    const [sessionChecking, setSessionChecking] = useState(true)

    // Validation Logic
    const isValidLength = password.length >= 12
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumber = /[0-9]/.test(password)
    const isMetRequirements = isValidLength && hasUpperCase && hasLowerCase && hasNumber
    const isMatching = password === confirmPassword && password !== ''

    useEffect(() => {
        // Simple check to ensure we have a session (handled by auto-signin via link)
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                // Wait a bit, sometimes it takes a moment for the hash to be processed
                setTimeout(async () => {
                    const { data: { session: retrySession } } = await supabase.auth.getSession()
                    if (!retrySession) {
                        // Ideally we might show an error or redirect, 
                        // but allowing them to try and getting an error is also valid feedback
                    }
                    setSessionChecking(false)
                }, 1000)
            } else {
                setSessionChecking(false)
            }
        }
        checkSession()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!isMetRequirements || !isMatching) return

        setLoading(true)
        setError('')

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            })

            if (error) throw error

            setSuccess(true)
        } catch (err: any) {
            console.error(err)
            setError(err.message || 'パスワードの更新に失敗しました。リンクの有効期限が切れている可能性があります。')
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
                <div className="w-full max-w-md card-soft p-10 text-center">
                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-sm">
                        <Check className="w-12 h-12 text-black" strokeWidth={4} />
                    </div>
                    <h2 className="text-2xl font-black text-black mb-4">パスワード更新完了！</h2>
                    <p className="text-slate-600 font-bold mb-8">
                        新しいパスワードでログインできます。
                    </p>
                    <Link
                        href="/login"
                        className="btn-primary w-full flex items-center justify-center gap-2 font-black py-4 text-lg"
                    >
                        ログイン画面へ
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8">
            <div className="w-full max-w-md">
                <div className="card-soft p-10">
                    <div className="mb-8 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-black rounded-2xl mb-4 shadow-lg shadow-black/20">
                            <Key className="w-8 h-8 text-white" strokeWidth={4} />
                        </div>
                        <h1 className="text-2xl font-black text-black">
                            新しいパスワード
                        </h1>
                        <p className="text-slate-500 font-bold mt-2 text-sm">
                            推測されにくいパスワードを設定してください
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-black mb-2">
                                新しいパスワード
                            </label>
                            <div className="relative mb-2">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-4 border-4 border-black rounded-xl text-lg font-bold bg-white focus:outline-none focus:bg-slate-50 transition"
                                    placeholder="12文字以上・英数大小など"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-black transition"
                                >
                                    {showPassword ? <EyeOff size={24} strokeWidth={4} /> : <Eye size={24} strokeWidth={4} />}
                                </button>
                            </div>

                            <div className="space-y-1 pl-1">
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
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-black mb-2">
                                確認用
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-4 border-4 border-black rounded-xl text-lg font-bold bg-white focus:outline-none focus:bg-slate-50 transition"
                                placeholder="もう一度入力してください"
                            />
                            {!isMatching && confirmPassword && (
                                <div className="mt-2 p-2 bg-red-50 border-2 border-black text-black text-xs font-black flex items-center gap-2">
                                    パスワードが一致しません
                                </div>
                            )}
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 border-4 border-black rounded-lg text-black text-sm font-black">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={!isMetRequirements || !isMatching || loading || sessionChecking}
                            className={`w-full py-4 rounded-xl font-black text-white flex items-center justify-center gap-2 transition-all ${!isMetRequirements || !isMatching || loading || sessionChecking
                                ? 'bg-slate-300 cursor-not-allowed shadow-none'
                                : 'btn-primary hover:shadow-xl hover:-translate-y-0.5'
                                }`}
                        >
                            {loading ? (
                                <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                'パスワードを変更する'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
