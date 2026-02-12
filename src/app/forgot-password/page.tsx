'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Mail, ChevronLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            // Always treat as success for security (prevent email enumeration)
            // unless it's a critical error we can't hide (which we usually hide anyway)
            await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            })

            // Artificial delay for better UX if it's too fast
            await new Promise(resolve => setTimeout(resolve, 1000))

            setSuccess(true)
        } catch (err) {
            console.error('Reset password error:', err)
            // Even on error, show success to prevent email enumeration
            setSuccess(true)
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
                <div className="w-full max-w-md card-soft p-10 text-center">
                    <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-sm">
                        <Mail className="w-10 h-10 text-black" strokeWidth={4} />
                    </div>
                    <h2 className="text-2xl font-black text-black mb-4">メールを送信しました</h2>
                    <p className="text-slate-600 font-bold mb-8 leading-relaxed">
                        もし <span className="text-black bg-slate-100 px-2 py-1 rounded mx-1">{email}</span> が<br />
                        登録されていれば、パスワード再設定用の<br />
                        メールが送信されます。
                    </p>
                    <div className="bg-amber-50 p-4 rounded-xl border-2 border-amber-100 mb-8 text-left">
                        <p className="text-xs font-bold text-amber-800 leading-relaxed">
                            ※メールが届かない場合：<br />
                            • 迷惑メールフォルダをご確認ください<br />
                            • メールアドレスにお間違いがないかご確認ください
                        </p>
                    </div>
                    <Link
                        href="/"
                        className="btn-primary w-full flex items-center justify-center gap-2 font-black py-4 text-lg"
                    >
                        ホームに戻る
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8">
            <div className="w-full max-w-md">
                <Link href="/login" className="inline-flex items-center gap-2 text-slate-500 hover:text-black font-bold mb-8 transition group">
                    <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" strokeWidth={3} />
                    ログインに戻る
                </Link>

                <div className="card-soft p-10">
                    <div className="mb-8 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-black rounded-2xl mb-4 shadow-lg shadow-black/20">
                            <Mail className="w-8 h-8 text-white" strokeWidth={3} />
                        </div>
                        <h1 className="text-2xl font-black text-black">
                            パスワード再設定
                        </h1>
                        <p className="text-slate-500 font-bold mt-2 text-sm">
                            登録したメールアドレスを入力してください。<br />
                            再設定用のリンクをお送りします。
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-black mb-2">
                                メールアドレス
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-4 border-2 border-slate-200 rounded-xl text-lg font-bold bg-white focus:outline-none focus:border-black focus:ring-4 focus:ring-black/5 transition placeholder:text-slate-300 placeholder:font-normal"
                                placeholder="example@school.edu"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full py-4 text-lg font-black flex items-center justify-center gap-2 hover:shadow-xl hover:-translate-y-0.5 transition-all"
                        >
                            {loading ? (
                                <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                '再設定メールを送信'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
