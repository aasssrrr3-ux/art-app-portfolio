/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, TaskBox, Class } from '@/lib/supabase'
import { ChevronLeft, Plus, Calendar, Clock, CheckCircle, Edit, Trash2, X } from 'lucide-react'
import Link from 'next/link'

interface TaskBoxWithClass extends TaskBox {
    classes?: Class
}

export default function TeacherTaskBoxPage() {
    const router = useRouter()
    const { user, loading } = useAuth()
    const [taskBoxes, setTaskBoxes] = useState<TaskBoxWithClass[]>([])
    const [classes, setClasses] = useState<Class[]>([])
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [isCreating, setIsCreating] = useState(false)

    // Create Form state
    const [selectedClassId, setSelectedClassId] = useState('')
    const [unitName, setUnitName] = useState('')
    const [taskName, setTaskName] = useState('')
    const [dueDate, setDueDate] = useState('')

    // Edit Form state
    const [editingTaskBox, setEditingTaskBox] = useState<TaskBoxWithClass | null>(null)
    const [editUnitName, setEditUnitName] = useState('')
    const [editTaskName, setEditTaskName] = useState('')
    const [editDueDate, setEditDueDate] = useState('')
    const [isUpdating, setIsUpdating] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login?role=teacher')
        }
    }, [user, loading, router])

    useEffect(() => {
        if (user) {
            fetchClasses()
            fetchTaskBoxes()
        }
    }, [user])

    const fetchClasses = async () => {
        try {
            const { data } = await supabase
                .from('classes')
                .select('*')
                .eq('teacher_id', user?.id)

            setClasses(data || [])
            if (data && data.length > 0) {
                setSelectedClassId(data[0].id)
            }
        } catch (error) {
            console.error('Error fetching classes:', error)
        }
    }

    const fetchTaskBoxes = async () => {
        try {
            const { data } = await supabase
                .from('task_boxes')
                .select(`
          *,
          classes (*)
        `)
                .order('created_at', { ascending: false })

            // Filter manually or use RLS. Here we trust RLS but also filtering by class ownership is good.
            // Actually the query above will return all task boxes visible to the user.
            // Since RLS policies "Teachers can manage task boxes" checks ownership, this is fine.
            // However, to be safe and efficient let's trust the RLS.

            setTaskBoxes(data || [])
        } catch (error) {
            console.error('Error fetching task boxes:', error)
        }
    }

    const handleCreate = async () => {
        if (!selectedClassId || !unitName.trim() || !taskName.trim()) return

        setIsCreating(true)
        try {
            const { error } = await supabase
                .from('task_boxes')
                .insert({
                    class_id: selectedClassId,
                    unit_name: unitName,
                    task_name: taskName,
                    due_date: dueDate || null,
                    is_active: true
                })

            if (error) throw error

            setUnitName('')
            setTaskName('')
            setDueDate('')
            setShowCreateModal(false)
            fetchTaskBoxes()
        } catch (error) {
            console.error('Error creating task box:', error)
        } finally {
            setIsCreating(false)
        }
    }

    const handleUpdate = async () => {
        if (!editingTaskBox || !editUnitName.trim() || !editTaskName.trim()) return

        setIsUpdating(true)
        try {
            const res = await fetch('/api/teacher/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'updateTaskBox',
                    taskBoxId: editingTaskBox.id,
                    unitName: editUnitName,
                    taskName: editTaskName,
                    dueDate: editDueDate || null
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            setEditingTaskBox(null)
            fetchTaskBoxes()
        } catch (error: any) {
            console.error('Error updating task box:', error)
            alert(`更新失敗: ${error.message}`)
        } finally {
            setIsUpdating(false)
        }
    }

    const handleDelete = async (box: TaskBoxWithClass) => {
        if (!confirm(`課題箱「${box.unit_name} - ${box.task_name}」を削除しますか？\n\n【注意】\n・提出された作品も全て削除されます\n・この操作は取り消せません`)) return

        setIsDeleting(true)
        try {
            const res = await fetch('/api/teacher/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'deleteTaskBox',
                    taskBoxId: box.id
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            fetchTaskBoxes()
        } catch (error: any) {
            console.error('Error deleting task box:', error)
            alert(`削除失敗: ${error.message}`)
        } finally {
            setIsDeleting(false)
        }
    }

    const toggleActive = async (taskBox: TaskBoxWithClass) => {
        try {
            await supabase
                .from('task_boxes')
                .update({ is_active: !taskBox.is_active })
                .eq('id', taskBox.id)

            fetchTaskBoxes()
        } catch (error) {
            console.error('Error toggling task box:', error)
        }
    }

    const startEditing = (box: TaskBoxWithClass) => {
        setEditingTaskBox(box)
        setEditUnitName(box.unit_name)
        setEditTaskName(box.task_name)
        setEditDueDate(box.due_date ? new Date(box.due_date).toISOString().split('T')[0] : '')
    }

    const activeBoxes = taskBoxes.filter(t => t.is_active)
    const archivedBoxes = taskBoxes.filter(t => !t.is_active)

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-[#5b5fff] border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen p-4 md:p-8">
            {/* Header */}
            <div className="page-header mb-6">
                <Link href="/teacher/home" className="back-button">
                    <ChevronLeft className="w-6 h-6 text-slate-600" />
                </Link>
                <div className="flex-1">
                    <p className="page-subtitle">CHECK BOX</p>
                    <h1 className="page-title">課題箱管理</h1>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    新規作成
                </button>
            </div>

            <div className="max-w-4xl mx-auto">
                {/* Active Task Boxes */}
                <div className="mb-8">
                    <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-[#5b5fff]" />
                        進行中 ({activeBoxes.length})
                    </h2>

                    {activeBoxes.length === 0 ? (
                        <div className="card-soft-sm p-6 text-center text-slate-500">
                            進行中の課題箱はありません
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {activeBoxes.map(box => (
                                <div key={box.id} className="card-soft-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-[#5b5fff]/10 flex items-center justify-center flex-shrink-0">
                                            <Calendar className="w-6 h-6 text-[#5b5fff]" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900">
                                                {box.unit_name} - {box.task_name}
                                            </p>
                                            <p className="text-sm text-slate-500">
                                                {(box.classes as any)?.name}
                                                {box.due_date && (
                                                    <> • 期限: {new Date(box.due_date).toLocaleDateString('ja-JP')}</>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 justify-end">
                                        <button
                                            onClick={() => startEditing(box)}
                                            className="p-2 text-slate-400 hover:text-[#5b5fff] hover:bg-[#5b5fff]/5 rounded-full transition"
                                            title="編集"
                                        >
                                            <Edit className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => toggleActive(box)}
                                            className="text-sm text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 border border-transparent hover:border-slate-200 transition"
                                        >
                                            終了する
                                        </button>
                                        <button
                                            onClick={() => handleDelete(box)}
                                            disabled={isDeleting}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition"
                                            title="削除"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Archived Task Boxes */}
                {archivedBoxes.length > 0 && (
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-slate-400" />
                            終了 ({archivedBoxes.length})
                        </h2>
                        <div className="space-y-3 opacity-60 hover:opacity-100 transition duration-300">
                            {archivedBoxes.map(box => (
                                <div key={box.id} className="card-soft-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                                            <Calendar className="w-6 h-6 text-slate-400" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-700">
                                                {box.unit_name} - {box.task_name}
                                            </p>
                                            <p className="text-sm text-slate-500">
                                                {(box.classes as any)?.name}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 justify-end">
                                        <button
                                            onClick={() => startEditing(box)}
                                            className="p-2 text-slate-400 hover:text-[#5b5fff] hover:bg-[#5b5fff]/5 rounded-full transition"
                                            title="編集"
                                        >
                                            <Edit className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => toggleActive(box)}
                                            className="text-sm text-[#5b5fff] hover:text-[#4b4fe0] px-3 py-1.5 rounded-lg hover:bg-[#5b5fff]/5 border border-transparent hover:border-[#5b5fff]/20 transition"
                                        >
                                            再開する
                                        </button>
                                        <button
                                            onClick={() => handleDelete(box)}
                                            disabled={isDeleting}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition"
                                            title="削除"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-md">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-slate-900">新規課題箱作成</h2>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="p-2 rounded-full hover:bg-slate-100"
                            >
                                <X className="w-6 h-6 text-slate-500" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    クラス
                                </label>
                                <select
                                    value={selectedClassId}
                                    onChange={(e) => setSelectedClassId(e.target.value)}
                                    className="input-field"
                                >
                                    {classes.map(cls => (
                                        <option key={cls.id} value={cls.id}>{cls.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    単元名
                                </label>
                                <input
                                    type="text"
                                    value={unitName}
                                    onChange={(e) => setUnitName(e.target.value)}
                                    className="input-field"
                                    placeholder="例: 水彩画の基礎"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    課題名
                                </label>
                                <input
                                    type="text"
                                    value={taskName}
                                    onChange={(e) => setTaskName(e.target.value)}
                                    className="input-field"
                                    placeholder="例: 第1回 下描き"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    期限（任意）
                                </label>
                                <input
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    className="input-field"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="btn-secondary flex-1"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={isCreating || !unitName.trim() || !taskName.trim()}
                                className="btn-primary flex-1"
                            >
                                {isCreating ? '作成中...' : '作成'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editingTaskBox && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-slate-900">課題箱の編集</h2>
                            <button
                                onClick={() => setEditingTaskBox(null)}
                                className="p-2 rounded-full hover:bg-slate-100"
                            >
                                <X className="w-6 h-6 text-slate-500" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    単元名
                                </label>
                                <input
                                    type="text"
                                    value={editUnitName}
                                    onChange={(e) => setEditUnitName(e.target.value)}
                                    className="input-field"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    課題名
                                </label>
                                <input
                                    type="text"
                                    value={editTaskName}
                                    onChange={(e) => setEditTaskName(e.target.value)}
                                    className="input-field"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    期限（任意）
                                </label>
                                <input
                                    type="date"
                                    value={editDueDate}
                                    onChange={(e) => setEditDueDate(e.target.value)}
                                    className="input-field"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setEditingTaskBox(null)}
                                className="btn-secondary flex-1"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleUpdate}
                                disabled={isUpdating || !editUnitName.trim() || !editTaskName.trim()}
                                className="btn-primary flex-1"
                            >
                                {isUpdating ? '更新中...' : '更新'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
