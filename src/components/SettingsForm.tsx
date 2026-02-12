'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Lock, LogOut, Check, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface SettingsFormProps {
    role: 'student' | 'teacher'
}

export default function SettingsForm({ role }: SettingsFormProps) {
    const router = useRouter()
    const { signOut, user } = useAuth()

    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    const [showCurrentPassword, setShowCurrentPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)

    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [succeededPraise, setSucceededPraise] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    // Validation Logic
    const isValidLength = newPassword.length >= 12
    const hasUpperCase = /[A-Z]/.test(newPassword)
    const hasLowerCase = /[a-z]/.test(newPassword)
    const hasNumber = /[0-9]/.test(newPassword)
    const isMetRequirements = isValidLength && hasUpperCase && hasLowerCase && hasNumber
    const isMatching = newPassword === confirmPassword && newPassword !== ''

    const isSubmitDisabled = !isMetRequirements || !isMatching || !currentPassword || isLoading

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setIsLoading(true)

        try {
            if (!user || !user.email) throw new Error('ユーザー情報が見つかりません')

            // 1. Verify Current Password
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: currentPassword.trim(),
            })

            if (signInError) {
                throw new Error('現在のパスワードが間違っています')
            }

            // 2. Update Password
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword
            })

            if (updateError) throw updateError

            // Success
            setSucceededPraise(role === 'student' ? '設定完了！' : '更新完了')
            setSuccess(true)

        } catch (err: any) {
            console.error(err)
            setError(err.message || 'パスワードの更新に失敗しました')
        } finally {
            setIsLoading(false)
        }
    }

    const handleLogout = async () => {
        try {
            await signOut()
            router.push('/')
        } catch (error) {
            console.error('Logout failed:', error)
        }
    }

    const handleReturnHome = () => {
        router.push(role === 'teacher' ? '/teacher/home' : '/student/home')
    }

    // Success View
    if (success) {
        return (
            <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
                <div className="card-soft p-12 text-center max-w-sm w-full">
                    <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                        <Check className="w-12 h-12 text-black" strokeWidth={4} />
                    </div>
                    <h2 className="text-3xl font-black text-black mb-2">{succeededPraise}</h2>
                    <p className="text-slate-600 font-bold mb-10">パスワードを更新しました！</p>

                    <button
                        onClick={handleReturnHome}
                        className="btn-primary w-full py-4 text-lg font-black flex items-center justify-center gap-2"
                    >
                        ホームに戻る
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-md mx-auto">
            <div className="card-soft p-8">
                <h2 className="text-xl font-black text-black mb-6 flex items-center gap-2">
                    <Lock className="w-6 h-6 text-black" strokeWidth={4} />
                    パスワード変更
                </h2>

                <form onSubmit={handlePasswordUpdate} className="space-y-6">
                    {/* Current Password */}
                    <div>
                        <label className="block text-sm font-bold text-black mb-2">
                            現在のパスワード
                        </label>
                        <div className="relative">
                            <input
                                type={showCurrentPassword ? "text" : "password"}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full px-4 py-3 border-4 border-black rounded-lg text-black bg-white focus:outline-none focus:bg-slate-50 transition font-bold"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-black"
                            >
                                {showCurrentPassword ? <EyeOff size={24} strokeWidth={4} /> : <Eye size={24} strokeWidth={4} />}
                            </button>
                        </div>
                    </div>

                    {/* New Password */}
                    <div>
                        <label className="block text-sm font-bold text-black mb-2">
                            新しいパスワード
                        </label>
                        <div className="relative mb-2">
                            <input
                                type={showNewPassword ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-4 py-3 border-4 border-black rounded-lg text-black bg-white focus:outline-none focus:bg-slate-50 transition font-bold"
                                placeholder="12文字以上・大文字・小文字・数字"
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-black"
                            >
                                {showNewPassword ? <EyeOff size={24} strokeWidth={4} /> : <Eye size={24} strokeWidth={4} />}
                            </button>
                        </div>

                        {/* Validation Indicators */}
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

                    {/* Confirm Password */}
                    <div>
                        <label className="block text-sm font-bold text-black mb-2">
                            新しいパスワード（確認）
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-3 border-4 border-black rounded-lg text-black bg-white focus:outline-none focus:bg-slate-50 transition font-bold"
                            placeholder="もう一度入力してください"
                        />
                        {!isMatching && confirmPassword && (
                            <div className="mt-2 p-2 bg-red-50 border-2 border-black text-black text-xs font-black flex items-center gap-2">
                                パスワードが一致しません
                            </div>
                        )}
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-4 bg-red-50 border-4 border-black rounded-lg text-black text-sm font-black">
                            {error}
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isSubmitDisabled}
                        className={`w-full py-4 rounded-xl font-black text-white flex items-center justify-center gap-2 transition-all ${isSubmitDisabled
                            ? 'bg-slate-300 cursor-not-allowed shadow-none'
                            : 'bg-black hover:bg-slate-800 shadow-lg hover:shadow-xl hover:-translate-y-0.5'
                            }`}
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <>
                                <Check className="w-5 h-5" strokeWidth={4} />
                                パスワードを更新する
                            </>
                        )}
                    </button>
                </form>

                {/* Logout Section */}
                <div className="mt-12 pt-8 border-t-2 border-slate-100">
                    <button
                        onClick={handleLogout}
                        className="w-full py-4 rounded-xl font-black text-black border-2 border-black hover:bg-slate-50 flex items-center justify-center gap-2 transition"
                    >
                        <LogOut className="w-5 h-5 text-black" strokeWidth={4} />
                        ログアウト
                    </button>
                </div>
            </div>
        </div>
    )
}
