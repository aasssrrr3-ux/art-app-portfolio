'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, Class, TaskBox, Work, TeacherComment } from '@/lib/supabase'
import { Send, Circle } from 'lucide-react'
import { ChevronLeft, ChevronRight, Users, Grid3X3, List, X } from 'lucide-react'
import Link from 'next/link'
import AnnotationLayer from '@/components/AnnotationLayer'

interface ClassMemberWithUser {
    id: string
    user_id: string
    student_number: number
    users?: { name: string; email: string }
}

interface WorkWithStudent extends Work {
    users?: { name: string }
    teacher_comments?: TeacherComment[]
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
        try {
            const { data } = await supabase
                .from('works')
                .select(`
                    *,
                    users:student_id (name),
                    teacher_comments (id, comment, created_at)
                `)
                .eq('task_box_id', selectedTaskBox.id)

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
                        <p className="page-subtitle">GRADE VIEW</p>
                        <h1 className="page-title">SELECT CLASS</h1>
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
                    <p className="page-subtitle">GRADE VIEW</p>
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
                                            <td className="px-4 py-4 text-right">
                                                {submitted && (
                                                    <button
                                                        onClick={() => viewWork(member)}
                                                        className="text-[#5b5fff] text-sm font-medium hover:underline"
                                                    >
                                                        VIEW WORK →
                                                    </button>
                                                )}
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
                                    onClick={() => work && viewWork(member)}
                                    className={`card-soft-sm p-4 ${submitted ? 'bg-green-50 border-green-200 cursor-pointer hover:shadow-lg' : 'bg-red-50 border-red-200'} border transition`}
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
                            )
                        })}
                    </div>
                )}
            </div>

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
        </div>
    )
}
