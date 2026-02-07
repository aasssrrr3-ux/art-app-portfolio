'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, Class } from '@/lib/supabase'
import { Camera, Share2, Clock, ChevronDown, LogOut, UserPlus, Heart } from 'lucide-react'
import Link from 'next/link'

export default function StudentHomePage() {
    const router = useRouter()
    const { user, loading, signOut } = useAuth()
    const [classes, setClasses] = useState<Class[]>([])
    const [selectedClass, setSelectedClass] = useState<Class | null>(null)
    const [showDropdown, setShowDropdown] = useState(false)
    const [showJoinModal, setShowJoinModal] = useState(false)
    const [classCode, setClassCode] = useState('')
    const [isJoining, setIsJoining] = useState(false)
    const [joinError, setJoinError] = useState('')
    const [isFetchingClasses, setIsFetchingClasses] = useState(true) // Start true

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login?role=student')
        } else if (!loading && user?.role !== 'student') {
            router.push('/teacher/home')
        }
    }, [user, loading, router])

    useEffect(() => {
        if (user) {
            fetchClasses()
        } else if (!loading) {
            // No user and not loading (logged out?), stop fetching
            setIsFetchingClasses(false)
        }
    }, [user, loading])

    const fetchClasses = async () => {
        setIsFetchingClasses(true)
        try {
            if (!user) return

            const { data: memberships, error: memberError } = await supabase
                .from('class_members')
                .select('class_id')
                .eq('user_id', user.id)

            if (memberError) throw memberError

            if (memberships && memberships.length > 0) {
                const classIds = memberships.map(m => m.class_id)
                const { data: classData, error: classError } = await supabase
                    .from('classes')
                    .select('*')
                    .in('id', classIds)

                if (classError) throw classError
                setClasses(classData || [])
                if (classData && classData.length > 0) {
                    setSelectedClass(classData[0])
                }
            } else {
                setClasses([])
            }
        } catch (error) {
            console.error('Error fetching classes:', error)
        } finally {
            setIsFetchingClasses(false)
        }
    }

    const handleJoinClass = async () => {
        if (!classCode.trim() || !user) return

        setIsJoining(true)
        setJoinError('')

        try {
            // クラスコードでクラスを検索
            const { data: classData, error: classError } = await supabase
                .from('classes')
                .select('*')
                .eq('code', classCode.trim().toUpperCase())
                .single()

            if (classError || !classData) {
                throw new Error('クラスが見つかりません。コードを確認してください。')
            }

            // 既に参加しているか確認
            const { data: existing } = await supabase
                .from('class_members')
                .select('id')
                .eq('class_id', classData.id)
                .eq('user_id', user.id)
                .single()

            if (existing) {
                throw new Error('すでにこのクラスに参加しています。')
            }

            // クラスに参加
            const { error: joinError } = await supabase
                .from('class_members')
                .insert({
                    class_id: classData.id,
                    user_id: user.id,
                    student_number: null
                })

            if (joinError) throw joinError

            // 成功
            setShowJoinModal(false)
            setClassCode('')
            fetchClasses()
        } catch (error: any) {
            setJoinError(error.message || 'クラス参加に失敗しました')
        } finally {
            setIsJoining(false)
        }
    }

    const handleSignOut = async () => {
        await signOut()
        router.push('/')
    }

    // Show loading spinner while checking auth OR fetching classes
    if (loading || (user && isFetchingClasses)) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-[#5b5fff] border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <p className="page-subtitle">WELCOME!</p>
                    <h1 className="text-2xl font-bold text-slate-900">
                        {user?.name || 'ゲスト'}さん
                    </h1>
                </div>

                <div className="flex items-center gap-4">
                    {/* Favorites Link */}
                    <Link href="/student/favorites">
                        <button className="p-2 rounded-full hover:bg-slate-100 transition text-slate-400 hover:text-pink-500">
                            <Heart className="w-6 h-6" />
                        </button>
                    </Link>

                    {/* Class Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => classes.length > 0 ? setShowDropdown(!showDropdown) : setShowJoinModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
                        >
                            <span>{selectedClass?.name || 'クラスに参加'}</span>
                            <ChevronDown className="w-4 h-4" />
                        </button>

                        {showDropdown && classes.length > 0 && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-10">
                                {classes.map((cls) => (
                                    <button
                                        key={cls.id}
                                        onClick={() => {
                                            setSelectedClass(cls)
                                            setShowDropdown(false)
                                        }}
                                        className="w-full px-4 py-3 text-left text-slate-700 hover:bg-slate-50 first:rounded-t-lg last:rounded-b-lg"
                                    >
                                        {cls.name}
                                    </button>
                                ))}
                                <button
                                    onClick={() => {
                                        setShowDropdown(false)
                                        setShowJoinModal(true)
                                    }}
                                    className="w-full px-4 py-3 text-left text-[#5b5fff] hover:bg-slate-50 border-t flex items-center gap-2"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    新しいクラスに参加
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Logout */}
                    <button
                        onClick={handleSignOut}
                        className="text-slate-400 hover:text-slate-600 text-sm"
                    >
                        EXIT
                    </button>
                </div>
            </div>

            {/* クラス未参加の場合 */}
            {classes.length === 0 ? (
                <div className="max-w-md mx-auto text-center py-16">
                    <div className="w-20 h-20 rounded-full bg-[#5b5fff]/10 flex items-center justify-center mx-auto mb-6">
                        <UserPlus className="w-10 h-10 text-[#5b5fff]" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">クラスに参加しましょう</h2>
                    <p className="text-slate-500 mb-6">先生から共有されたクラスコードを入力してください</p>
                    <button
                        onClick={() => setShowJoinModal(true)}
                        className="btn-primary"
                    >
                        クラスコードを入力
                    </button>
                </div>
            ) : (
                /* Main Menu */
                <div className="max-w-xl mx-auto space-y-6">
                    {/* Camera - Primary Action */}
                    <Link href="/student/submit" className="block">
                        <div className="menu-card active py-12">
                            <Camera className="w-12 h-12 mb-4" />
                            <h2 className="text-2xl font-bold mb-1">作品を撮る</h2>
                            <p className="text-sm opacity-80 uppercase tracking-wider">CAMERA</p>
                        </div>
                    </Link>

                    {/* Gallery */}
                    <Link href="/student/gallery" className="block">
                        <div className="menu-card">
                            <Share2 className="w-10 h-10 text-[#5b5fff] mb-4" />
                            <h2 className="text-xl font-bold text-slate-900 mb-1">みんなのギャラリー</h2>
                            <p className="text-xs text-slate-400 uppercase tracking-wider">GALLERY</p>
                        </div>
                    </Link>

                    {/* History */}
                    <Link href="/student/portfolio" className="block">
                        <div className="menu-card">
                            <Clock className="w-10 h-10 text-[#5b5fff] mb-4" />
                            <h2 className="text-xl font-bold text-slate-900 mb-1">振り返り</h2>
                            <p className="text-xs text-slate-400 uppercase tracking-wider">HISTORY</p>
                        </div>
                    </Link>
                </div>
            )}

            {/* Footer */}
            <p className="text-center text-slate-400 text-xs uppercase tracking-widest mt-16">
                ART EDUCATION SYSTEM V1.0
            </p>

            {/* Join Class Modal */}
            {showJoinModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-md">
                        <h2 className="text-xl font-bold text-slate-900 mb-2">クラスに参加</h2>
                        <p className="text-slate-500 mb-6">先生から共有されたクラスコードを入力してください</p>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                クラスコード
                            </label>
                            <input
                                type="text"
                                value={classCode}
                                onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                                className="input-field text-center text-2xl font-mono tracking-widest"
                                placeholder="XXXXXX"
                                maxLength={10}
                            />
                        </div>

                        {joinError && (
                            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm mb-4">
                                {joinError}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowJoinModal(false)
                                    setClassCode('')
                                    setJoinError('')
                                }}
                                className="btn-secondary flex-1"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleJoinClass}
                                disabled={isJoining || !classCode.trim()}
                                className="btn-primary flex-1"
                            >
                                {isJoining ? '参加中...' : '参加する'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
