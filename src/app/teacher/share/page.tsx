'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, Class, Work } from '@/lib/supabase'
import { ChevronLeft, Camera, Image, Upload, ChevronDown, Send, X, User } from 'lucide-react'
import Link from 'next/link'

interface ClassMemberWithUser {
    id: string
    user_id: string
    student_number: number
    users?: { name: string }
}

interface WorkWithTask extends Work {
    task_boxes?: { task_name: string }
}

export default function TeacherSharePage() {
    const router = useRouter()
    const { user, loading } = useAuth()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    const [classes, setClasses] = useState<Class[]>([])
    const [selectedClass, setSelectedClass] = useState<Class | null>(null)
    const [showClassDropdown, setShowClassDropdown] = useState(false)

    const [mode, setMode] = useState<'select' | 'camera' | 'preview'>('select')
    const [capturedImage, setCapturedImage] = useState<string | null>(null)
    const [title, setTitle] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [stream, setStream] = useState<MediaStream | null>(null)

    // Work Selection State
    const [isWorkSelectorOpen, setIsWorkSelectorOpen] = useState(false)
    const [taskBoxes, setTaskBoxes] = useState<{ id: string; task_name: string }[]>([])
    const [selectedTaskBoxId, setSelectedTaskBoxId] = useState<string | null>(null)
    const [unitWorks, setUnitWorks] = useState<(Work & { users: { name: string } })[]>([])
    const [loadingWorks, setLoadingWorks] = useState(false)

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
        if (selectedClass) {
            fetchTaskBoxes()
        }
    }, [selectedClass])

    useEffect(() => {
        if (selectedTaskBoxId) {
            fetchWorksByTaskBox(selectedTaskBoxId)
        } else {
            setUnitWorks([])
        }
    }, [selectedTaskBoxId])

    useEffect(() => {
        if (mode === 'camera') {
            startCamera()
        }
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop())
            }
        }
    }, [mode])

    const fetchClasses = async () => {
        try {
            const { data } = await supabase
                .from('classes')
                .select('*')
                .eq('teacher_id', user?.id)

            setClasses(data || [])
        } catch (error) {
            console.error('Error fetching classes:', error)
        }
    }

    const fetchTaskBoxes = async () => {
        if (!selectedClass) return
        try {
            const { data } = await supabase
                .from('task_boxes')
                .select('id, task_name')
                .eq('class_id', selectedClass.id)
                .order('created_at', { ascending: true })

            setTaskBoxes(data || [])
            if (data && data.length > 0) {
                setSelectedTaskBoxId(data[0].id)
            }
        } catch (error) {
            console.error('Error fetching task boxes:', error)
        }
    }

    const fetchWorksByTaskBox = async (taskBoxId: string) => {
        setLoadingWorks(true)
        try {
            // Need to join class_members to get user_id, then users to get name?
            // Wait, works table usually has student_id (which is user_id) directly or class_member_id?
            // Checked supabase.ts: Work has student_id (string). 
            // We need to get the user name.
            // works -> student_id (user_id) -> users (name)

            const { data, error } = await supabase
                .from('works')
                .select(`
                    *,
                    users:student_id (name)
                `)
                .eq('task_box_id', taskBoxId)
                .order('created_at', { ascending: false })

            if (error) throw error
            // @ts-ignore
            setUnitWorks(data || [])
        } catch (error) {
            console.error('Error fetching works:', error)
        } finally {
            setLoadingWorks(false)
        }
    }

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            })
            setStream(mediaStream)
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream
            }
        } catch (error) {
            console.error('Error starting camera:', error)
        }
    }

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current
            const canvas = canvasRef.current
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            const ctx = canvas.getContext('2d')
            if (ctx) {
                ctx.drawImage(video, 0, 0)
                const imageData = canvas.toDataURL('image/jpeg', 0.9)
                setCapturedImage(imageData)
                setMode('preview')
                if (stream) {
                    stream.getTracks().forEach(track => track.stop())
                }
            }
        }
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                setCapturedImage(reader.result as string)
                setMode('preview')
            }
            reader.readAsDataURL(file)
        }
    }

    const handleSelectWork = (work: Work, workTitle: string) => {
        setCapturedImage(work.image_url)
        setTitle(workTitle) // Auto-fill title
        setIsWorkSelectorOpen(false)
        setMode('preview')
    }

    const handleSubmit = async () => {
        if (!capturedImage || !selectedClass || !title.trim() || !user) return

        setIsSubmitting(true)
        try {
            // Check if capturedImage is already a URL (from existing work) or base64 (new upload)
            let publicUrl = capturedImage

            if (capturedImage.startsWith('data:')) {
                const response = await fetch(capturedImage)
                const blob = await response.blob()
                const fileName = `${user.id}/${selectedClass.id}/${Date.now()}.jpg`

                const { error: uploadError } = await supabase.storage
                    .from('resources')
                    .upload(fileName, blob, { contentType: 'image/jpeg' })

                if (uploadError) throw uploadError

                const { data } = supabase.storage
                    .from('resources')
                    .getPublicUrl(fileName)
                publicUrl = data.publicUrl
            }

            await supabase
                .from('shared_resources')
                .insert({
                    class_id: selectedClass.id,
                    teacher_id: user.id,
                    title: title,
                    image_url: publicUrl
                })

            alert('共有しました！')
            setMode('select')
            setCapturedImage(null)
            setTitle('')
        } catch (error) {
            console.error('Error sharing resource:', error)
            alert('共有に失敗しました')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
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
                <div>
                    <p className="page-subtitle">SHARE RESOURCES</p>
                    <h1 className="page-title">資料共有</h1>
                </div>
            </div>

            <div className="max-w-xl mx-auto">
                {/* Class Selector */}
                <div className="card-soft-sm p-4 mb-6">
                    <p className="text-xs text-primary uppercase tracking-wider font-semibold mb-3">
                        STEP 1: クラスを選択
                    </p>

                    <div className="relative">
                        <button
                            onClick={() => setShowClassDropdown(!showClassDropdown)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 rounded-lg text-left"
                        >
                            <span className="text-slate-900 font-medium">
                                {selectedClass?.name || '配信先のクラスを選択してください'}
                            </span>
                            <ChevronDown className="w-5 h-5 text-slate-400" />
                        </button>

                        {showClassDropdown && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border z-10 max-h-60 overflow-y-auto">
                                {classes.map(cls => (
                                    <button
                                        key={cls.id}
                                        onClick={() => {
                                            setSelectedClass(cls)
                                            setShowClassDropdown(false)
                                        }}
                                        className="w-full px-4 py-3 text-left hover:bg-slate-50 text-slate-700 block"
                                    >
                                        {cls.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {!selectedClass && (
                        <p className="text-primary text-sm mt-3 text-center">
                            ↑ まずはクラスを選択してください
                        </p>
                    )}
                </div>

                {/* Mode Selection / Content */}
                {mode === 'select' && (
                    <div className={`grid grid-cols-3 gap-4 ${!selectedClass ? 'opacity-50 pointer-events-none' : ''}`}>
                        <button
                            onClick={() => setMode('camera')}
                            className="menu-card active"
                        >
                            <Camera className="w-8 h-8 mb-3" />
                            <p className="font-bold">撮影して共有</p>
                            <p className="text-xs opacity-70 uppercase mt-1">CAPTURE NOW</p>
                        </button>

                        <button
                            onClick={() => {
                                setIsWorkSelectorOpen(true)
                                if (selectedClass && taskBoxes.length === 0) {
                                    fetchTaskBoxes()
                                }
                            }}
                            className="menu-card"
                        >
                            <Image className="w-8 h-8 text-primary mb-3" />
                            <p className="font-bold text-slate-900">作品から共有</p>
                            <p className="text-xs text-slate-400 uppercase mt-1">SELECT STUDENT WORK</p>
                        </button>

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="menu-card"
                        >
                            <Upload className="w-8 h-8 text-primary mb-3" />
                            <p className="font-bold text-slate-900">画像を共有</p>
                            <p className="text-xs text-slate-400 uppercase mt-1">UPLOAD FILE</p>
                        </button>
                    </div>
                )}

                {/* Camera Mode */}
                {mode === 'camera' && (
                    <div className="card-soft overflow-hidden">
                        <div className="relative aspect-[4/3] bg-black">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                className="w-full h-full object-cover"
                            />
                            <canvas ref={canvasRef} className="hidden" />

                            <button
                                onClick={capturePhoto}
                                className="absolute bottom-6 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg hover:scale-105 transition"
                            >
                                <div className="w-12 h-12 rounded-full border-4 border-primary" />
                            </button>

                            <button
                                onClick={() => {
                                    if (stream) stream.getTracks().forEach(t => t.stop())
                                    setMode('select')
                                }}
                                className="absolute top-4 left-4 px-4 py-2 bg-white/90 rounded-lg text-sm"
                            >
                                キャンセル
                            </button>
                        </div>
                    </div>
                )}

                {/* Preview Mode */}
                {mode === 'preview' && capturedImage && (
                    <div className="space-y-4">
                        <div className="card-soft overflow-hidden">
                            <img
                                src={capturedImage}
                                alt="Preview"
                                className="w-full aspect-[4/3] object-cover"
                            />
                        </div>

                        <div className="card-soft-sm p-4">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                タイトル
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="input-field"
                                placeholder="例: 水彩の良い例"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setCapturedImage(null)
                                    setMode('select')
                                }}
                                className="btn-secondary flex-1"
                            >
                                やり直す
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || !title.trim()}
                                className="btn-primary flex-1 flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Send className="w-5 h-5" />
                                        共有する
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                />
            </div>

            {/* Work Selection Modal */}
            {isWorkSelectorOpen && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-lg text-slate-900">作品を選択</h3>
                                <p className="text-xs text-slate-500">クラス: {selectedClass?.name}</p>
                            </div>
                            <button onClick={() => setIsWorkSelectorOpen(false)} className="p-2 hover:bg-slate-100 rounded-full">
                                <X className="w-6 h-6 text-slate-500" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                            {/* Left Sidebar: Task Boxes (Units) */}
                            <div className="md:w-1/4 border-r border-slate-100 overflow-y-auto bg-slate-50">
                                <div className="p-3">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">
                                        単元 (Task Box)
                                    </p>
                                    <div className="space-y-1">
                                        {taskBoxes.map(box => (
                                            <button
                                                key={box.id}
                                                onClick={() => setSelectedTaskBoxId(box.id)}
                                                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition ${selectedTaskBoxId === box.id
                                                    ? 'bg-white shadow text-primary font-bold'
                                                    : 'text-slate-600 hover:bg-white/50'
                                                    }`}
                                            >
                                                <span className="truncate">{box.task_name}</span>
                                                {selectedTaskBoxId === box.id && (
                                                    <div className="w-2 h-2 rounded-full bg-primary" />
                                                )}
                                            </button>
                                        ))}
                                        {taskBoxes.length === 0 && (
                                            <div className="px-3 py-4 text-center text-xs text-slate-400">
                                                単元がありません
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Main Content: Works Grid */}
                            <div className="flex-1 overflow-y-auto p-4 bg-white">
                                {loadingWorks ? (
                                    <div className="h-full flex items-center justify-center">
                                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : unitWorks.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                        <Image className="w-12 h-12 mb-2 opacity-20" />
                                        <p>この単元の作品はまだありません</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {unitWorks.map(work => {
                                            const taskName = taskBoxes.find(t => t.id === selectedTaskBoxId)?.task_name || '課題'
                                            const workTitle = `${taskName} - ${work.users?.name || 'Unknown'}`

                                            return (
                                                <button
                                                    key={work.id}
                                                    onClick={() => handleSelectWork(work, workTitle)}
                                                    className="bg-slate-50 p-2 rounded-xl border border-slate-100 hover:border-primary hover:shadow-md transition text-left group"
                                                >
                                                    <div className="aspect-square bg-white rounded-lg mb-2 overflow-hidden relative">
                                                        <img
                                                            src={work.image_url}
                                                            alt="Work"
                                                            className="w-full h-full object-cover group-hover:scale-105 transition"
                                                        />
                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition" />
                                                    </div>
                                                    <p className="text-xs font-bold text-slate-900 truncate">
                                                        {work.users?.name || 'Unknown'}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 truncate">
                                                        {new Date(work.created_at).toLocaleDateString()}
                                                    </p>
                                                </button>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
