'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, Class } from '@/lib/supabase'
import { ChevronLeft, Camera, Image, Upload, ChevronDown, Send } from 'lucide-react'
import Link from 'next/link'

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

    const handleSubmit = async () => {
        if (!capturedImage || !selectedClass || !title.trim() || !user) return

        setIsSubmitting(true)
        try {
            const response = await fetch(capturedImage)
            const blob = await response.blob()
            const fileName = `${user.id}/${selectedClass.id}/${Date.now()}.jpg`

            const { error: uploadError } = await supabase.storage
                .from('resources')
                .upload(fileName, blob, { contentType: 'image/jpeg' })

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('resources')
                .getPublicUrl(fileName)

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
                <div>
                    <p className="page-subtitle">SHARE RESOURCES</p>
                    <h1 className="page-title">SHARING WITH STUDENTS</h1>
                </div>
            </div>

            <div className="max-w-xl mx-auto">
                {/* Class Selector */}
                <div className="card-soft-sm p-4 mb-6">
                    <p className="text-xs text-[#5b5fff] uppercase tracking-wider font-semibold mb-3">
                        STEP 1: SELECT TARGET CLASS
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
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border z-10">
                                {classes.map(cls => (
                                    <button
                                        key={cls.id}
                                        onClick={() => {
                                            setSelectedClass(cls)
                                            setShowClassDropdown(false)
                                        }}
                                        className="w-full px-4 py-3 text-left hover:bg-slate-50 text-slate-700"
                                    >
                                        {cls.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {!selectedClass && (
                        <p className="text-[#5b5fff] text-sm mt-3 text-center">
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
                            onClick={() => alert('作品からの共有機能は開発中です')}
                            className="menu-card"
                        >
                            <Image className="w-8 h-8 text-[#5b5fff] mb-3" />
                            <p className="font-bold text-slate-900">作品から共有</p>
                            <p className="text-xs text-slate-400 uppercase mt-1">SELECT STUDENT WORK</p>
                        </button>

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="menu-card"
                        >
                            <Upload className="w-8 h-8 text-[#5b5fff] mb-3" />
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
                                <div className="w-12 h-12 rounded-full border-4 border-[#5b5fff]" />
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

            <p className="text-center text-slate-400 text-xs uppercase tracking-widest mt-16">
                ACADEMIC SHARE SYSTEM
            </p>
        </div>
    )
}
