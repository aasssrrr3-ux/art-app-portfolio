'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, Class } from '@/lib/supabase'
import { Users, FolderPlus, Share2, ClipboardList, ChevronRight, LogOut, Plus } from 'lucide-react'
import Link from 'next/link'

export default function TeacherHomePage() {
    const router = useRouter()
    const { user, loading, signOut } = useAuth()
    const [classes, setClasses] = useState<Class[]>([])
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [newClassName, setNewClassName] = useState('')
    const [isCreating, setIsCreating] = useState(false)

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login?role=teacher')
        } else if (!loading && user?.role !== 'teacher') {
            router.push('/student/home')
        }
    }, [user, loading, router])

    useEffect(() => {
        if (user) {
            fetchClasses()
        }
    }, [user])

    const fetchClasses = async () => {
        try {
            const { data, error } = await supabase
                .from('classes')
                .select('*')
                .eq('teacher_id', user?.id)
                .order('created_at', { ascending: false })

            if (error) throw error
            setClasses(data || [])
        } catch (error) {
            console.error('Error fetching classes:', error)
        }
    }

    const generateClassCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        let code = ''
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return code
    }

    const handleCreateClass = async () => {
        if (!newClassName.trim() || !user) return

        setIsCreating(true)
        try {
            const { error } = await supabase
                .from('classes')
                .insert({
                    name: newClassName,
                    code: generateClassCode(),
                    teacher_id: user.id
                })

            if (error) throw error

            setNewClassName('')
            setShowCreateModal(false)
            fetchClasses()
        } catch (error) {
            console.error('Error creating class:', error)
        } finally {
            setIsCreating(false)
        }
    }

    const handleSignOut = async () => {
        await signOut()
        router.push('/')
    }

    if (loading) {
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
                    <p className="page-subtitle">先生用ダッシュボード</p>
                    <h1 className="text-2xl font-bold text-slate-900">
                        {user?.name || '先生'}
                    </h1>
                </div>

                <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 text-slate-400 hover:text-slate-600 text-sm"
                >
                    <LogOut className="w-4 h-4" />
                    ログアウト
                </button>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {/* Left Column - Classes */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-slate-900">クラス一覧</h2>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-1 text-[#5b5fff] hover:text-[#4b4fe0] text-sm font-medium"
                        >
                            <Plus className="w-4 h-4" />
                            新規作成
                        </button>
                    </div>

                    <div className="space-y-3">
                        {classes.length === 0 ? (
                            <div className="card-soft-sm p-6 text-center text-slate-500">
                                クラスがありません。<br />新規作成してください。
                            </div>
                        ) : (
                            classes.map((cls) => (
                                <Link key={cls.id} href={`/teacher/class/${cls.id}`}>
                                    <div className="card-soft-sm p-4 flex items-center justify-between hover:shadow-lg transition cursor-pointer">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                                                <Users className="w-5 h-5 text-slate-500" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900">{cls.name}</p>
                                                <p className="text-xs text-slate-400">コード: {cls.code}</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-slate-400" />
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Column - Menu */}
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-900 mb-4">メニュー</h2>

                    <Link href="/teacher/taskbox" className="block">
                        <div className="menu-card py-6 flex-row gap-4 justify-start px-6">
                            <div className="w-12 h-12 rounded-xl bg-[#5b5fff] flex items-center justify-center">
                                <FolderPlus className="w-6 h-6 text-white" />
                            </div>
                            <div className="text-left">
                                <h3 className="font-bold text-slate-900">課題設定</h3>
                                <p className="text-xs text-slate-500">課題箱の作成・管理</p>
                            </div>
                        </div>
                    </Link>

                    <Link href="/teacher/share" className="block">
                        <div className="menu-card py-6 flex-row gap-4 justify-start px-6">
                            <div className="w-12 h-12 rounded-xl bg-[#22c55e] flex items-center justify-center">
                                <Share2 className="w-6 h-6 text-white" />
                            </div>
                            <div className="text-left">
                                <h3 className="font-bold text-slate-900">資料共有</h3>
                                <p className="text-xs text-slate-500">生徒への資料共有</p>
                            </div>
                        </div>
                    </Link>

                    <Link href="/teacher/grade" className="block">
                        <div className="menu-card py-6 flex-row gap-4 justify-start px-6">
                            <div className="w-12 h-12 rounded-xl bg-[#f59e0b] flex items-center justify-center">
                                <ClipboardList className="w-6 h-6 text-white" />
                            </div>
                            <div className="text-left">
                                <h3 className="font-bold text-slate-900">提出状況</h3>
                                <p className="text-xs text-slate-500">提出状況の確認・評価</p>
                            </div>
                        </div>
                    </Link>
                </div>
            </div>

            {/* Create Class Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-md">
                        <h2 className="text-xl font-bold text-slate-900 mb-6">新規クラス作成</h2>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                クラス名
                            </label>
                            <input
                                type="text"
                                value={newClassName}
                                onChange={(e) => setNewClassName(e.target.value)}
                                className="input-field"
                                placeholder="例: 1年1組（美術）"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="btn-secondary flex-1"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleCreateClass}
                                disabled={isCreating || !newClassName.trim()}
                                className="btn-primary flex-1"
                            >
                                {isCreating ? '作成中...' : '作成'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <p className="text-center text-slate-400 text-xs uppercase tracking-widest mt-16">
                TEACHER MANAGEMENT SYSTEM
            </p>
        </div>
    )
}
