/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, Class, TaskBox, Work, TeacherComment } from '@/lib/supabase'
import { Send, Circle, Play, Pause, SkipBack, SkipForward, X, MessageCircle, Trash2, ThumbsUp, Heart, Sparkles, Smile, Settings, Key, UserMinus, AlertTriangle } from 'lucide-react'
import { ChevronLeft, ChevronRight, Users, Grid3X3, List } from 'lucide-react'
import Link from 'next/link'
import AnnotationLayer from '@/components/AnnotationLayer'

interface ClassMemberWithUser {
    id: string
    user_id: string
    class_id: string
    student_number: number
    users?: { name: string; email: string }
}

interface WorkWithStudent extends Work {
    users?: { name: string }
    teacher_comments?: TeacherComment[]
    reactions?: {
        reaction_type: string
        users: { name: string }
    }[]
}

export default function TeacherGradePage() {
    const router = useRouter()
    const { user, loading } = useAuth()
    const [classes, setClasses] = useState<Class[]>([])
    const [selectedClass, setSelectedClass] = useState<Class | null>(null)
    const [taskBoxes, setTaskBoxes] = useState<TaskBox[]>([])
    const [selectedTaskBox, setSelectedTaskBox] = useState<TaskBox | null>(null)
    const [members, setMembers] = useState<ClassMemberWithUser[]>([])
    const [works, setWorks] = useState<WorkWithStudent[]>([])
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
    const [step, setStep] = useState<'class' | 'detail'>('class')
    const [selectedWork, setSelectedWork] = useState<WorkWithStudent | null>(null)
    const [selectedMember, setSelectedMember] = useState<ClassMemberWithUser | null>(null)
    const [isImageZoomed, setIsImageZoomed] = useState(false)
    const [commentText, setCommentText] = useState('')
    const [isSavingComment, setIsSavingComment] = useState(false)
    const [showAnnotation, setShowAnnotation] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    // Admin State
    const [managingMember, setManagingMember] = useState<ClassMemberWithUser | null>(null)
    const [newPassword, setNewPassword] = useState('')
    const [isAdminLoading, setIsAdminLoading] = useState(false)

    // Playback State
    const [playbackWorks, setPlaybackWorks] = useState<WorkWithStudent[]>([])
    const [isPlaybackModalOpen, setIsPlaybackModalOpen] = useState(false)
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const [playSpeed, setPlaySpeed] = useState<1 | 2 | 4>(1)
    const playIntervalRef = useRef<NodeJS.Timeout | null>(null)

    // Playback Logic
    useEffect(() => {
        if (isPlaying && playbackWorks.length > 0) {
            playIntervalRef.current = setInterval(() => {
                setCurrentIndex(prev => {
                    if (prev >= playbackWorks.length - 1) {
                        setIsPlaying(false)
                        return prev
                    }
                    return prev + 1
                })
            }, 2000 / playSpeed)
        }

        return () => {
            if (playIntervalRef.current) {
                clearInterval(playIntervalRef.current)
            }
        }
    }, [isPlaying, playSpeed, playbackWorks])

    const fetchStudentPortfolio = async (studentId: string) => {
        try {
            const { data } = await supabase
                .from('works')
                .select(`
                    *,
                    users:student_id (name),
                    teacher_comments (id, comment, created_at),
                    task_boxes (unit_name, task_name),
                    reactions (reaction_type, users:sender_id (name))
                `)
                .eq('student_id', studentId)
                .order('created_at', { ascending: true })

            if (data) {
                setPlaybackWorks(data)
                setCurrentIndex(0)
                setIsPlaybackModalOpen(true)
                setIsPlaying(true)
            }
        } catch (error) {
            console.error('Error fetching student portfolio:', error)
        }
    }

    const closePlaybackModal = () => {
        setIsPlaybackModalOpen(false)
        setIsPlaying(false)
        setPlaybackWorks([])
        setCurrentIndex(0)
    }

    const togglePlayback = () => {
        if (currentIndex >= playbackWorks.length - 1) {
            setCurrentIndex(0)
        }
        setIsPlaying(!isPlaying)
    }


    useEffect(() => {
        if (!loading && !user) {
            router.push('/login?role=teacher')
        }
    }, [user, loading, router])

    useEffect(() => {
        if (user) {
            fetchClasses()
        }
    }, [user])

    useEffect(() => {
        if (selectedClass && selectedTaskBox) {
            fetchMembers()
            fetchWorks()
        }
    }, [selectedClass, selectedTaskBox])

    const fetchClasses = async () => {
        try {
            const { data } = await supabase
                .from('classes')
                .select('*')
                .eq('teacher_id', user?.id)
                .order('created_at', { ascending: false })

            setClasses(data || [])
        } catch (error) {
            console.error('Error fetching classes:', error)
        }
    }

    const fetchTaskBoxes = async (classId: string) => {
        try {
            const { data } = await supabase
                .from('task_boxes')
                .select('*')
                .eq('class_id', classId)
                .order('created_at', { ascending: false })

            setTaskBoxes(data || [])
            if (data && data.length > 0) {
                setSelectedTaskBox(data[0])
            }
        } catch (error) {
            console.error('Error fetching task boxes:', error)
        }
    }

    const fetchMembers = async () => {
        if (!selectedClass) return
        try {
            const { data } = await supabase
                .from('class_members')
                .select(`
          *,
          users:user_id (name, email)
        `)
                .eq('class_id', selectedClass.id)
                .order('student_number', { ascending: true })

            setMembers(data || [])
        } catch (error) {
            console.error('Error fetching members:', error)
        }
    }

    const fetchWorks = async () => {
        if (!selectedTaskBox) return
        console.log('[GradeView] Fetching works for TaskBox:', selectedTaskBox.id, selectedTaskBox.task_name)
        try {
            const { data, error } = await supabase
                .from('works')
                .select(`
                    *,
                    users:student_id (name),
                    teacher_comments (id, comment, created_at),
                    reactions (reaction_type, users:sender_id (name))
                `)
                .eq('task_box_id', selectedTaskBox.id)

            if (error) {
                console.error('[GradeView] Error fetching works:', error)
            } else {
                console.log('[GradeView] Fetched works:', data?.length, data)
            }

            setWorks(data || [])
        } catch (error) {
            console.error('Error fetching works:', error)
        }
    }

    const selectClass = (cls: Class) => {
        setSelectedClass(cls)
        fetchTaskBoxes(cls.id)
        setStep('detail')
    }

    const getSubmissionStatus = (userId: string) => {
        return works.some(w => w.student_id === userId)
    }

    const viewWork = (member: ClassMemberWithUser) => {
        const work = works.find(w => w.student_id === member.user_id)
        if (work) {
            setSelectedWork(work)
            setSelectedMember(member)
            // Prefill with existing comment if any
            setCommentText(work.teacher_comments?.[0]?.comment || '')
        }
    }

    const deleteWork = async () => {
        if (!selectedWork || !confirm('本当に削除しますか？\n削除された作品は元に戻せません。')) return
        setIsDeleting(true)
        try {
            const { error } = await supabase
                .from('works')
                .delete()
                .eq('id', selectedWork.id)

            if (error) throw error

            // Update local state and close modal
            setWorks(prev => prev.filter(w => w.id !== selectedWork.id))
            setPlaybackWorks(prev => prev.filter(w => w.id !== selectedWork.id))
            setSelectedWork(null)
            setSelectedMember(null)
        } catch (error) {
            console.error('Error deleting work:', error)
            alert('削除に失敗しました')
        } finally {
            setIsDeleting(false)
        }
    }

    const getReactionIcon = (type: string) => {
        switch (type) {
            case 'awesome': return <Sparkles className="w-3 h-3 text-amber-500" />
            case 'great': return <Heart className="w-3 h-3 text-rose-500" />
            case 'good': return <ThumbsUp className="w-3 h-3 text-blue-500" />
            case 'smile': return <Smile className="w-3 h-3 text-green-500" />
            default: return null
        }
    }

    // Admin Actions
    const handleResetPassword = async () => {
        if (!managingMember || !newPassword.trim()) return
        if (!confirm(`${(managingMember.users as any)?.name}さんのパスワードを変更しますか？`)) return

        setIsAdminLoading(true)
        try {
            const res = await fetch('/api/teacher/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'resetPassword',
                    studentId: managingMember.user_id,
                    newPassword: newPassword.trim()
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            alert('パスワードを変更しました')
            setNewPassword('')
        } catch (error: any) {
            console.error('Password reset failed:', error)
            alert(`エラー: ${error.message}`)
        } finally {
            setIsAdminLoading(false)
        }
    }

    const handleRemoveStudent = async () => {
        if (!managingMember) return
        if (!confirm(`${(managingMember.users as any)?.name}さんをクラスから削除しますか？\nこの操作は取り消せません。`)) return

        setIsAdminLoading(true)
        try {
            const res = await fetch('/api/teacher/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'removeStudent',
                    studentId: managingMember.user_id,
                    classId: managingMember.class_id
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            alert('生徒をクラスから削除しました')
            // Update local state
            setMembers(prev => prev.filter(m => m.id !== managingMember.id))
            setManagingMember(null)
        } catch (error: any) {
            console.error('Student removal failed:', error)
            alert(`エラー: ${error.message}`)
        } finally {
            setIsAdminLoading(false)
        }
    }

    const submittedCount = members.filter(m => getSubmissionStatus(m.user_id)).length
    const submissionRate = members.length > 0 ? Math.round((submittedCount / members.length) * 100) : 0

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-[#5b5fff] border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    // Class Selection View
    if (step === 'class') {
        return (
            <div className="min-h-screen p-4 md:p-8">
                <div className="page-header mb-6">
                    <Link href="/teacher/home" className="back-button">
                        <ChevronLeft className="w-6 h-6 text-slate-600" />
                    </Link>
                    <div>
                        <p className="page-subtitle">提出状況確認</p>
                        <h1 className="page-title">クラス選択</h1>
                    </div>
                </div>

                <div className="max-w-2xl mx-auto space-y-3">
                    {classes.length === 0 ? (
                        <div className="card-soft-sm p-6 text-center text-slate-500">
                            クラスがありません
                        </div>
                    ) : (
                        classes.map(cls => (
                            <button
                                key={cls.id}
                                onClick={() => selectClass(cls)}
                                className="card-soft-sm p-4 w-full flex items-center justify-between hover:shadow-lg transition"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                                        <Users className="w-5 h-5 text-slate-500" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-slate-900">{cls.name}</p>
                                        <p className="text-xs text-slate-400">CODE: {cls.code}</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-400" />
                            </button>
                        ))
                    )}
                </div>
            </div>
        )
    }

    // Detail View
    return (
        <div className="min-h-screen p-4 md:p-8">
            {/* Header */}
            <div className="page-header mb-6">
                <button onClick={() => setStep('class')} className="back-button">
                    <ChevronLeft className="w-6 h-6 text-slate-600" />
                </button>
                <div className="flex-1">
                    <p className="page-subtitle">提出状況確認</p>
                    <h1 className="page-title">{selectedClass?.name}</h1>
                </div>

                {/* Task Box Selector */}
                <select
                    value={selectedTaskBox?.id || ''}
                    onChange={(e) => {
                        const box = taskBoxes.find(t => t.id === e.target.value)
                        if (box) setSelectedTaskBox(box)
                    }}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-sm"
                >
                    {taskBoxes.map(box => (
                        <option key={box.id} value={box.id}>
                            {box.unit_name} - {box.task_name}
                        </option>
                    ))}
                </select>

                {/* View Toggle */}
                <div className="flex bg-slate-100 rounded-lg p-1">
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow' : ''}`}
                    >
                        <List className="w-5 h-5 text-slate-600" />
                    </button>
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow' : ''}`}
                    >
                        <Grid3X3 className="w-5 h-5 text-slate-600" />
                    </button>
                </div>
            </div>

            <div className="max-w-4xl mx-auto">
                {/* Submission Rate */}
                <div className="card-soft-sm p-6 mb-6">
                    <p className="text-xs text-[#5b5fff] uppercase tracking-wider font-semibold mb-2">
                        SUBMISSION RATE
                    </p>
                    <p className="text-5xl font-bold text-slate-900">{submissionRate}<span className="text-2xl">%</span></p>
                    <p className="text-sm text-slate-500 mt-1">
                        {submittedCount} / {members.length} Students
                    </p>
                </div>

                {/* Student List */}
                {viewMode === 'list' ? (
                    <div className="card-soft-sm overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50 text-left">
                                    <th className="px-4 py-3 text-xs uppercase tracking-wider text-slate-500 font-semibold">NO.</th>
                                    <th className="px-4 py-3 text-xs uppercase tracking-wider text-slate-500 font-semibold">STUDENT NAME</th>
                                    <th className="px-4 py-3 text-xs uppercase tracking-wider text-slate-500 font-semibold text-center">STATUS</th>
                                    <th className="px-4 py-3 text-xs uppercase tracking-wider text-slate-500 font-semibold text-right">ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {members.map(member => {
                                    const submitted = getSubmissionStatus(member.user_id)
                                    return (
                                        <tr key={member.id} className="border-t border-slate-100">
                                            <td className="px-4 py-4 text-[#5b5fff] font-medium">
                                                {member.student_number || '-'}
                                            </td>
                                            <td className="px-4 py-4 font-medium text-slate-900">
                                                {(member.users as any)?.name || 'Unknown'}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                {submitted ? (
                                                    <span className="badge-success">✓ SUBMITTED</span>
                                                ) : (
                                                    <span className="badge-danger">⏳ NOT YET</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-right flex items-center justify-end gap-2">
                                                {submitted && (
                                                    <button
                                                        onClick={() => viewWork(member)}
                                                        className="text-[#5b5fff] text-sm font-medium hover:underline"
                                                    >
                                                        VIEW WORK →
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setManagingMember(member)}
                                                    className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition"
                                                    title="生徒管理"
                                                >
                                                    <Settings className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {members.map(member => {
                            const submitted = getSubmissionStatus(member.user_id)
                            const work = works.find(w => w.student_id === member.user_id)
                            return (
                                <div
                                    key={member.id}
                                    className={`card-soft-sm p-4 relative group ${submitted ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border transition`}
                                >
                                    <button
                                        onClick={() => setManagingMember(member)}
                                        className="absolute top-2 right-2 p-1.5 bg-white/80 rounded-full text-slate-500 opacity-0 group-hover:opacity-100 hover:bg-white transition z-10"
                                    >
                                        <Settings className="w-4 h-4" />
                                    </button>
                                    <div
                                        onClick={() => work && viewWork(member)}
                                        className={submitted ? 'cursor-pointer' : ''}
                                    >
                                        {work ? (
                                            <img
                                                src={work.image_url}
                                                alt="Work"
                                                className="w-full aspect-square object-cover rounded-lg mb-3"
                                            />
                                        ) : (
                                            <div className="w-full aspect-square bg-slate-200 rounded-lg mb-3 flex items-center justify-center text-slate-400">
                                                未提出
                                            </div>
                                        )}
                                        <p className="text-sm font-medium text-slate-900">
                                            {member.student_number || '-'}. {(member.users as any)?.name || 'Unknown'}
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Admin Modal */}
            {managingMember && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] p-4">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">生徒管理</h3>
                                <p className="text-sm text-slate-500">{(managingMember.users as any)?.name} さん</p>
                            </div>
                            <button
                                onClick={() => setManagingMember(null)}
                                className="p-2 rounded-full hover:bg-slate-100"
                            >
                                <X className="w-6 h-6 text-slate-500" />
                            </button>
                        </div>

                        {/* Password Reset */}
                        <div className="mb-6 p-4 bg-slate-50 rounded-xl">
                            <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-3">
                                <Key className="w-5 h-5 text-slate-600" />
                                パスワードリセット
                            </h4>
                            <p className="text-xs text-slate-500 mb-3">
                                新しいパスワードを設定して、生徒に伝えてください。
                            </p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="新しいパスワード"
                                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                />
                                <button
                                    onClick={handleResetPassword}
                                    disabled={isAdminLoading || !newPassword}
                                    className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
                                >
                                    変更
                                </button>
                            </div>
                        </div>

                        {/* Remove Student */}
                        <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                            <h4 className="font-bold text-red-700 flex items-center gap-2 mb-2">
                                <UserMinus className="w-5 h-5" />
                                クラスから削除
                            </h4>
                            <p className="text-xs text-red-600 mb-4">
                                この生徒をクラスから削除します。生徒のデータは残りますが、このクラスにはアクセスできなくなります。
                            </p>
                            <button
                                onClick={handleRemoveStudent}
                                disabled={isAdminLoading}
                                className="w-full py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <AlertTriangle className="w-4 h-4" />
                                強制退会実行
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Work Detail Modal */}
            {selectedWork && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-2xl max-h-[90vh] overflow-auto">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wider">
                                    {selectedMember?.student_number || '-'}番
                                </p>
                                <h2 className="text-xl font-bold text-slate-900">
                                    {(selectedMember?.users as any)?.name || 'Unknown'}
                                </h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={deleteWork}
                                    disabled={isDeleting}
                                    className="p-2 rounded-full hover:bg-red-50 text-red-400 hover:text-red-500 transition"
                                    title="削除"
                                >
                                    <Trash2 className="w-6 h-6" />
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectedWork(null)
                                        setSelectedMember(null)
                                    }}
                                    className="p-2 rounded-full hover:bg-slate-100"
                                >
                                    <X className="w-6 h-6 text-slate-500" />
                                </button>
                            </div>
                        </div>

                        <div
                            className="relative cursor-pointer group"
                            onClick={() => setIsImageZoomed(true)}
                        >
                            <img
                                src={selectedWork.image_url}
                                alt="Work"
                                className="w-full rounded-2xl mb-4 transition-transform group-hover:scale-[1.02]"
                                style={{ filter: `brightness(${selectedWork.brightness || 100}%)` }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors rounded-2xl">
                                <span className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 px-3 py-1 rounded-full">
                                    タップで拡大
                                </span>
                            </div>
                        </div>

                        {/* Portfolio Playback Button */}
                        <button
                            onClick={() => selectedMember && fetchStudentPortfolio(selectedMember.user_id)}
                            className="w-full py-3 mb-4 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition flex items-center justify-center gap-2"
                        >
                            <Play className="w-5 h-5" />
                            この生徒のポートフォリオを再生
                        </button>

                        {/* Annotation Button */}
                        <button
                            onClick={() => setShowAnnotation(true)}
                            className="w-full py-3 mb-4 bg-amber-100 text-amber-700 rounded-xl font-medium hover:bg-amber-200 transition flex items-center justify-center gap-2"
                        >
                            <Circle className="w-5 h-5" />
                            丸囲みコメントを追加
                        </button>

                        {selectedWork.reflection && (
                            <div className="bg-slate-50 rounded-xl p-4">
                                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">感想・こだわり</p>
                                <p className="text-slate-900">{selectedWork.reflection}</p>
                            </div>
                        )}

                        {/* Reactions Section */}
                        {selectedWork.reactions && selectedWork.reactions.length > 0 && (
                            <div className="bg-amber-50/50 rounded-xl p-4 mt-4 border border-amber-100">
                                <p className="text-xs text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" />
                                    友達からのリアクション ({selectedWork.reactions.length})
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {selectedWork.reactions.map((reaction, i) => {
                                        const reactionLabels: Record<string, string> = {
                                            'star': '素敵',
                                            'clap': '拍手',
                                            'smile': '応援',
                                            'fire': 'すごい',
                                            'like': 'いいね'
                                        }
                                        const label = reactionLabels[reaction.reaction_type] || reaction.reaction_type

                                        return (
                                            <div key={i} className="bg-white px-2 py-1 rounded-full text-xs text-slate-600 border border-amber-100 flex items-center gap-1 shadow-sm">
                                                {getReactionIcon(reaction.reaction_type)}
                                                <span className="font-bold text-amber-600">{label}</span>
                                                <span className="text-slate-400 mx-1">/</span>
                                                {(reaction.users as any)?.name || 'Unknown'}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}


                        {/* Teacher Comment Section */}
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mt-4">
                            <p className="text-xs text-emerald-600 uppercase tracking-wider mb-2">先生からのコメント</p>
                            {selectedWork.teacher_comments && selectedWork.teacher_comments.length > 0 ? (
                                <p className="text-slate-900 mb-3">{selectedWork.teacher_comments[0].comment}</p>
                            ) : null}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    placeholder="コメントを入力..."
                                    className="flex-1 px-3 py-2 border border-emerald-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                <button
                                    onClick={async () => {
                                        if (!commentText.trim() || !selectedWork || !user) return
                                        setIsSavingComment(true)
                                        try {
                                            await supabase
                                                .from('teacher_comments')
                                                .upsert({
                                                    work_id: selectedWork.id,
                                                    teacher_id: user.id,
                                                    comment: commentText.trim()
                                                }, { onConflict: 'work_id,teacher_id' })
                                            // Update local state
                                            setWorks(prev => prev.map(w =>
                                                w.id === selectedWork.id
                                                    ? { ...w, teacher_comments: [{ id: '', work_id: w.id, teacher_id: user.id, comment: commentText.trim(), created_at: new Date().toISOString() }] }
                                                    : w
                                            ))
                                            setSelectedWork(prev => prev ? { ...prev, teacher_comments: [{ id: '', work_id: prev.id, teacher_id: user.id, comment: commentText.trim(), created_at: new Date().toISOString() }] } : null)
                                            setCommentText('')
                                        } catch (error) {
                                            console.error('Error saving comment:', error)
                                        }
                                        setIsSavingComment(false)
                                    }}
                                    disabled={isSavingComment || !commentText.trim()}
                                    className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition flex items-center gap-1"
                                >
                                    <Send className="w-4 h-4" />
                                    送信
                                </button>
                            </div>
                        </div>

                        <p className="text-xs text-slate-400 mt-4 text-center">
                            提出日時: {new Date(selectedWork.created_at).toLocaleString('ja-JP')}
                        </p>

                        {/* Share Button (New) */}
                        <div className="mt-6 pt-6 border-t border-slate-100">
                            <button
                                onClick={async () => {
                                    if (!selectedWork || !user || !selectedClass) return
                                    if (!confirm('この作品を「クラスの共有資料」に追加しますか？\n（クラス全員が見られるようになります）')) return

                                    try {
                                        const { error } = await supabase
                                            .from('shared_resources')
                                            .insert({
                                                class_id: selectedClass.id,
                                                teacher_id: user.id,
                                                title: `${(selectedMember?.users as any)?.name}さんの作品 - ${selectedTaskBox?.task_name}`,
                                                image_url: selectedWork.image_url
                                            })

                                        if (error) throw error
                                        alert('資料に追加しました！\n生徒は「共有資料」から閲覧できます。')
                                    } catch (error) {
                                        console.error('Error sharing resource:', error)
                                        alert('追加に失敗しました')
                                    }
                                }}
                                className="w-full py-3 bg-indigo-50 text-indigo-700 rounded-xl font-medium hover:bg-indigo-100 transition flex items-center justify-center gap-2"
                            >
                                <Users className="w-5 h-5" />
                                この作品をクラスの資料として共有する
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Fullscreen Image Zoom */}
            {isImageZoomed && selectedWork && (
                <div
                    className="fixed inset-0 bg-black z-[60] flex items-center justify-center cursor-pointer"
                    onClick={() => setIsImageZoomed(false)}
                >
                    <button
                        onClick={() => setIsImageZoomed(false)}
                        className="absolute top-4 right-4 p-3 bg-white/10 rounded-full hover:bg-white/20 transition"
                    >
                        <X className="w-8 h-8 text-white" />
                    </button>
                    <img
                        src={selectedWork.image_url}
                        alt="Work Fullscreen"
                        className="max-w-full max-h-full object-contain"
                        style={{ filter: `brightness(${selectedWork.brightness || 100}%)` }}
                    />
                    <p className="absolute bottom-4 text-white/50 text-sm">タップして閉じる</p>
                </div>
            )}

            {/* Annotation Layer */}
            {showAnnotation && selectedWork && user && (
                <AnnotationLayer
                    workId={selectedWork.id}
                    imageUrl={selectedWork.image_url}
                    brightness={selectedWork.brightness}
                    canEdit={true}
                    userId={user.id}
                    onClose={() => setShowAnnotation(false)}
                />
            )}

            {/* Playback Modal */}
            {isPlaybackModalOpen && playbackWorks.length > 0 && (
                <div className="fixed inset-0 bg-black/95 z-[60] flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 text-white">
                        <div>
                            <p className="text-xs text-white/60 uppercase tracking-wider">
                                PORTFOLIO PLAYBACK
                            </p>
                            <h2 className="text-lg font-bold">
                                {(playbackWorks[0].users as any)?.name}さんの軌跡
                            </h2>
                        </div>
                        <button
                            onClick={closePlaybackModal}
                            className="p-2 rounded-full hover:bg-white/10 transition"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-4 gap-4">
                        {/* Image */}
                        <div className="flex-1 flex items-center justify-center">
                            <div
                                className="relative cursor-pointer group"
                                onClick={() => setIsImageZoomed(true)} // Use global zoom
                            >
                                <img
                                    src={playbackWorks[currentIndex].image_url}
                                    alt="Work"
                                    className="max-h-[50vh] md:max-h-[70vh] w-auto rounded-2xl transition-transform group-hover:scale-[1.02]"
                                    style={{ filter: `brightness(${playbackWorks[currentIndex].brightness || 100}%)` }}
                                />
                                <div className="absolute bottom-4 left-4 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                                    {currentIndex + 1} / {playbackWorks.length}
                                </div>
                                <div className="absolute top-4 left-4 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                                    {(playbackWorks[currentIndex] as any).task_boxes?.unit_name || '未分類'} - {(playbackWorks[currentIndex] as any).task_boxes?.task_name || '課題なし'}
                                </div>
                            </div>
                        </div>

                        {/* Controls & Info Panel */}
                        <div className="md:w-80 space-y-4">
                            {/* Playback Controls */}
                            <div className="bg-slate-900 rounded-2xl p-4">
                                <div className="flex items-center justify-center gap-4 mb-4">
                                    <button
                                        onClick={() => {
                                            if (currentIndex > 0) {
                                                setCurrentIndex(prev => prev - 1)
                                                setIsPlaying(false)
                                            }
                                        }}
                                        disabled={currentIndex === 0}
                                        className="p-3 rounded-full hover:bg-white/10 disabled:opacity-30 transition"
                                    >
                                        <SkipBack className="w-6 h-6 text-white" />
                                    </button>
                                    <button
                                        onClick={togglePlayback}
                                        className="p-4 bg-[#5b5fff] rounded-full hover:bg-[#4a4eee] transition"
                                    >
                                        {isPlaying ? (
                                            <Pause className="w-8 h-8 text-white" />
                                        ) : (
                                            <Play className="w-8 h-8 text-white ml-1" />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (currentIndex < playbackWorks.length - 1) {
                                                setCurrentIndex(prev => prev + 1)
                                                setIsPlaying(false)
                                            }
                                        }}
                                        disabled={currentIndex >= playbackWorks.length - 1}
                                        className="p-3 rounded-full hover:bg-white/10 disabled:opacity-30 transition"
                                    >
                                        <SkipForward className="w-6 h-6 text-white" />
                                    </button>
                                </div>

                                {/* Speed Controls */}
                                <div className="flex items-center justify-between">
                                    <div className="flex gap-1">
                                        {([1, 2, 4] as const).map(speed => (
                                            <button
                                                key={speed}
                                                onClick={() => setPlaySpeed(speed)}
                                                className={`px-3 py-1 rounded-full text-xs font-medium transition ${playSpeed === speed
                                                    ? 'bg-[#5b5fff] text-white'
                                                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                                                    }`}
                                            >
                                                x{speed}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="text-white font-bold">
                                        <span className="text-2xl">{currentIndex + 1}</span>
                                        <span className="text-white/60">/{playbackWorks.length}</span>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="mt-4 flex gap-1">
                                    {playbackWorks.map((_, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                setCurrentIndex(idx)
                                                setIsPlaying(false)
                                            }}
                                            className={`flex-1 h-1 rounded-full transition ${idx <= currentIndex ? 'bg-[#5b5fff]' : 'bg-white/20'
                                                }`}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Reflection */}
                            {playbackWorks[currentIndex].reflection && (
                                <div className="bg-white rounded-2xl p-4">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                                        感想・こだわり
                                    </p>
                                    <p className="text-slate-900 text-sm">{playbackWorks[currentIndex].reflection}</p>
                                </div>
                            )}

                            {/* Teacher Comment */}
                            {playbackWorks[currentIndex].teacher_comments && playbackWorks[currentIndex].teacher_comments!.length > 0 && (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                                    <p className="text-xs text-emerald-600 uppercase tracking-wider mb-2">
                                        先生からのコメント
                                    </p>
                                    <p className="text-slate-900 text-sm">
                                        {playbackWorks[currentIndex].teacher_comments![0].comment}
                                    </p>
                                </div>
                            )}

                            {/* Date */}
                            <p className="text-xs text-white/40 text-center">
                                {new Date(playbackWorks[currentIndex].created_at).toLocaleString('ja-JP')}
                            </p>
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}
