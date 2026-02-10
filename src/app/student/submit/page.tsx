'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, TaskBox, Class } from '@/lib/supabase'
import { ChevronLeft, Camera, Sun, ChevronDown, Send, RefreshCw, Grid, Check } from 'lucide-react'
import Link from 'next/link'

export default function StudentSubmitPage() {
    const router = useRouter()
    const { user, loading } = useAuth()
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    const [classes, setClasses] = useState<Class[]>([])
    const [selectedClass, setSelectedClass] = useState<Class | null>(null)
    const [taskBoxes, setTaskBoxes] = useState<TaskBox[]>([])
    const [selectedTaskBox, setSelectedTaskBox] = useState<TaskBox | null>(null)
    const [showClassDropdown, setShowClassDropdown] = useState(false)
    const [showTaskDropdown, setShowTaskDropdown] = useState(false)

    const [stream, setStream] = useState<MediaStream | null>(null)
    const [capturedImage, setCapturedImage] = useState<string | null>(null)
    const [brightness, setBrightness] = useState(100)
    const [reflection, setReflection] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [step, setStep] = useState<'camera' | 'preview' | 'success'>('camera')
    const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
    const [showGrid, setShowGrid] = useState(false)
    const [praise, setPraise] = useState('')
    const praiseMessages = ['がんばったね！', '今日もいい感じ！', '最高の一枚だね！', '明日もまた描こう！']

    // Past Comparison State
    const [previousWorkUrl, setPreviousWorkUrl] = useState<string | null>(null)
    const [showOverlay, setShowOverlay] = useState(false)
    const [overlayOpacity, setOverlayOpacity] = useState(50)
    const [isCompareMode, setIsCompareMode] = useState(false)

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login?role=student')
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
        if (selectedTaskBox && user) {
            fetchPreviousWork()
        } else {
            setPreviousWorkUrl(null)
        }
    }, [selectedTaskBox, user])

    useEffect(() => {
        if (step === 'camera' && !capturedImage) {
            startCamera()
        }
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop())
            }
        }
    }, [step, capturedImage])

    const fetchClasses = async () => {
        try {
            const { data: memberships } = await supabase
                .from('class_members')
                .select('class_id')
                .eq('user_id', user?.id)

            if (memberships && memberships.length > 0) {
                const classIds = memberships.map(m => m.class_id)
                const { data: classData } = await supabase
                    .from('classes')
                    .select('*')
                    .in('id', classIds)

                setClasses(classData || [])
                if (classData && classData.length > 0) {
                    setSelectedClass(classData[0])
                }
            }
        } catch (error) {
            console.error('Error fetching classes:', error)
        }
    }

    const fetchTaskBoxes = async () => {
        if (!selectedClass) return
        try {
            const { data } = await supabase
                .from('task_boxes')
                .select('*')
                .eq('class_id', selectedClass.id)
                .eq('is_active', true)
                .order('created_at', { ascending: false })

            setTaskBoxes(data || [])
            if (data && data.length > 0) {
                setSelectedTaskBox(data[0])
            }
        } catch (error) {
            console.error('Error fetching task boxes:', error)
        }
    }

    const fetchPreviousWork = async () => {
        if (!selectedTaskBox || !user) return
        try {
            const { data } = await supabase
                .from('works')
                .select('image_url')
                .eq('student_id', user.id)
                .eq('task_box_id', selectedTaskBox.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single()

            if (data) {
                setPreviousWorkUrl(data.image_url)
                setShowOverlay(true) // Helper to auto-show if exists, or can be false by default
            } else {
                setPreviousWorkUrl(null)
            }
        } catch (error) {
            console.error('Error fetching previous work:', error)
        }
    }

    const startCamera = async (mode: 'environment' | 'user' = facingMode) => {
        try {
            // 既存のストリームを停止
            if (stream) {
                stream.getTracks().forEach(track => track.stop())
            }
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: mode }
            })
            setStream(mediaStream)
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream
            }
        } catch (error) {
            console.error('Error starting camera:', error)
        }
    }

    const toggleCamera = () => {
        const newMode = facingMode === 'environment' ? 'user' : 'environment'
        setFacingMode(newMode)
        startCamera(newMode)
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
                setStep('preview')
                // Stop camera
                if (stream) {
                    stream.getTracks().forEach(track => track.stop())
                }
            }
        }
    }

    const retakePhoto = () => {
        setCapturedImage(null)
        setStep('camera')
    }

    const handleSubmit = async () => {
        if (!capturedImage || !selectedTaskBox || !user) return

        setIsSubmitting(true)
        try {
            // Convert base64 to blob
            const response = await fetch(capturedImage)
            const blob = await response.blob()
            const fileName = `${user.id}/${selectedTaskBox.id}/${Date.now()}.jpg`

            // Upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('works')
                .upload(fileName, blob, { contentType: 'image/jpeg' })

            if (uploadError) throw uploadError

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('works')
                .getPublicUrl(fileName)

            // Save work record
            const { error: insertError } = await supabase
                .from('works')
                .insert({
                    student_id: user.id,
                    task_box_id: selectedTaskBox.id,
                    image_url: publicUrl,
                    brightness: brightness,
                    reflection: reflection
                })

            if (insertError) throw insertError

            if (insertError) throw insertError

            setPraise(praiseMessages[Math.floor(Math.random() * praiseMessages.length)])
            setStep('success')
        } catch (error) {
            console.error('Error submitting work:', error)
            alert('提出に失敗しました')
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

    if (step === 'success') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8">
                <div className="card-soft p-12 text-center max-w-sm w-full animate-in fade-in zoom-in duration-300">
                    <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                        <Check className="w-12 h-12 text-black" strokeWidth={4} />
                    </div>
                    <h2 className="text-3xl font-black text-black mb-2">{praise}</h2>
                    <p className="text-slate-600 font-bold mb-10">作品が正常に提出されました</p>

                    <div className="space-y-4">
                        <button
                            onClick={() => router.push('/student/portfolio')}
                            className="btn-primary w-full py-4 text-lg font-black flex items-center justify-center gap-2"
                        >
                            振り返り機能へ
                        </button>
                        <button
                            onClick={() => router.push('/student/gallery')}
                            className="btn-secondary w-full py-4 text-lg font-black flex items-center justify-center gap-2"
                        >
                            みんなのギャラリーへ
                        </button>
                        <Link
                            href="/student/home"
                            className="text-black font-black underline decoration-2 text-sm mt-4 hover:opacity-70 transition inline-block"
                        >
                            ホームに戻る
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen pt-20 px-4 pb-4 md:pt-48 md:px-8 md:pb-8">
            {/* Header */}
            <div className="page-header mb-6">
                <Link href="/student/home" className="back-button">
                    <ChevronLeft className="w-6 h-6 text-black" strokeWidth={4} />
                </Link>
                <div>
                    <p className="page-subtitle">SUBMIT WORK</p>
                    <h1 className="page-title">作品を撮る</h1>
                </div>
            </div>

            <div className="max-w-2xl mx-auto">
                {/* Task Selection */}
                <div className="card-soft-sm p-4 mb-6">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
                        STEP 1: SELECT TASK BOX
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                        {/* Class Selector */}
                        <div className="relative">
                            <button
                                onClick={() => setShowClassDropdown(!showClassDropdown)}
                                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 rounded-lg text-left"
                            >
                                <span className="text-slate-700 truncate">
                                    {selectedClass?.name || 'クラス'}
                                </span>
                                <ChevronDown className="w-4 h-4 text-black" strokeWidth={4} />
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

                        {/* Task Selector */}
                        <div className="relative">
                            <button
                                onClick={() => setShowTaskDropdown(!showTaskDropdown)}
                                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 rounded-lg text-left"
                            >
                                <span className="text-slate-700 truncate">
                                    {selectedTaskBox ? `${selectedTaskBox.unit_name} - ${selectedTaskBox.task_name}` : '課題箱'}
                                </span>
                                <ChevronDown className="w-4 h-4 text-black" strokeWidth={4} />
                            </button>
                            {showTaskDropdown && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border z-10">
                                    {taskBoxes.map(box => (
                                        <button
                                            key={box.id}
                                            onClick={() => {
                                                setSelectedTaskBox(box)
                                                setShowTaskDropdown(false)
                                            }}
                                            className="w-full px-4 py-3 text-left hover:bg-slate-50 text-slate-700"
                                        >
                                            {box.unit_name} - {box.task_name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Camera / Preview */}
                <div className="card-soft overflow-hidden mb-6">
                    {step === 'camera' ? (
                        <div className="relative aspect-[4/3] bg-black">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                className="w-full h-full object-cover"
                            />
                            <canvas ref={canvasRef} className="hidden" />

                            {/* Previous Work Overlay */}
                            {showOverlay && previousWorkUrl && (
                                <div
                                    className="absolute inset-0 pointer-events-none"
                                    style={{ opacity: overlayOpacity / 100 }}
                                >
                                    <img
                                        src={previousWorkUrl}
                                        alt="Previous Work"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}

                            {/* Grid Overlay */}
                            {showGrid && (
                                <div className="camera-grid">
                                    <div className="camera-grid-cell" />
                                    <div className="camera-grid-cell" />
                                    <div className="camera-grid-cell" />
                                    <div className="camera-grid-cell" />
                                    <div className="camera-grid-cell" />
                                    <div className="camera-grid-cell" />
                                    <div className="camera-grid-cell" />
                                    <div className="camera-grid-cell" />
                                    <div className="camera-grid-cell" />
                                </div>
                            )}

                            {/* Overlay Controls */}
                            {previousWorkUrl && (
                                <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                                    <button
                                        onClick={() => setShowOverlay(!showOverlay)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-md transition ${showOverlay
                                            ? 'bg-[#5b5fff]/80 text-white'
                                            : 'bg-black/40 text-white/80 hover:bg-black/60'
                                            }`}
                                    >
                                        {showOverlay ? '前回の画像: ON' : '前回の画像: OFF'}
                                    </button>

                                    {showOverlay && (
                                        <input
                                            type="range"
                                            min="10"
                                            max="90"
                                            value={overlayOpacity}
                                            onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                                            className="w-32 accent-[#5b5fff] h-1.5 bg-black/20 rounded-lg appearance-none cursor-pointer"
                                        />
                                    )}
                                </div>
                            )}

                            {/* Camera Controls */}
                            <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-8">
                                {/* Spacer */}
                                <div className="w-12" />

                                {/* Capture Button */}
                                <button
                                    onClick={capturePhoto}
                                    className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg hover:scale-105 transition"
                                >
                                    <div className="w-12 h-12 rounded-full border-4 border-[#5b5fff]" />
                                </button>

                                {/* Switch Camera Button */}
                                <button
                                    onClick={toggleCamera}
                                    className="w-12 h-12 rounded-full bg-white/80 flex items-center justify-center shadow-lg hover:bg-white transition"
                                >
                                    <RefreshCw className="w-6 h-6 text-slate-700" />
                                </button>

                                {/* Grid Toggle Button */}
                                <button
                                    onClick={() => setShowGrid(!showGrid)}
                                    className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition ${showGrid ? 'bg-[#5b5fff] text-white' : 'bg-white/80 text-slate-700 hover:bg-white'
                                        }`}
                                >
                                    <Grid className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="relative">
                            <div className={`grid gap-4 ${isCompareMode && previousWorkUrl ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                {/* Previous Work (Comparison Mode) */}
                                {isCompareMode && previousWorkUrl && (
                                    <div className="relative">
                                        <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 rounded text-white text-xs z-10">
                                            前回の記録
                                        </div>
                                        <img
                                            src={previousWorkUrl}
                                            alt="Previous"
                                            className="w-full aspect-[4/3] object-cover rounded-lg"
                                        />
                                    </div>
                                )}

                                {/* Current Work */}
                                <div className="relative">
                                    {isCompareMode && previousWorkUrl && (
                                        <div className="absolute top-2 left-2 px-2 py-1 bg-[#5b5fff] rounded text-white text-xs z-10">
                                            今回の記録
                                        </div>
                                    )}
                                    <img
                                        src={capturedImage || ''}
                                        alt="Captured"
                                        className="w-full aspect-[4/3] object-cover rounded-lg"
                                        style={{ filter: `brightness(${brightness}%)` }}
                                    />
                                </div>
                            </div>

                            {/* Controls Overlay */}
                            <div className="absolute top-4 right-4 flex flex-col gap-2">
                                <button
                                    onClick={retakePhoto}
                                    className="px-4 py-2 bg-white/90 rounded-lg text-sm font-medium text-slate-700 hover:bg-white shadow-sm"
                                >
                                    撮り直す
                                </button>

                                {previousWorkUrl && (
                                    <button
                                        onClick={() => setIsCompareMode(!isCompareMode)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm ${isCompareMode
                                            ? 'bg-[#5b5fff] text-white'
                                            : 'bg-white/90 text-slate-700 hover:bg-white'
                                            }`}
                                    >
                                        {isCompareMode ? '比較を終了' : '前回と比較'}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Brightness Slider */}
                {step === 'preview' && (
                    <div className="card-soft-sm p-4 mb-6">
                        <div className="flex items-center gap-3 mb-3">
                            <Sun className="w-5 h-5 text-amber-500" />
                            <span className="text-sm font-medium text-slate-700">明るさ調整</span>
                            <span className="text-sm text-slate-500 ml-auto">{brightness}%</span>
                        </div>
                        <input
                            type="range"
                            min="50"
                            max="150"
                            value={brightness}
                            onChange={(e) => setBrightness(Number(e.target.value))}
                            className="w-full accent-[#5b5fff]"
                        />
                    </div>
                )}

                {/* Reflection Input */}
                {step === 'preview' && (
                    <div className="card-soft-sm p-4 mb-6">
                        <label className="block text-sm font-medium text-slate-700 mb-3">
                            今日のこだわり・感想（任意）
                        </label>
                        <textarea
                            value={reflection}
                            onChange={(e) => setReflection(e.target.value)}
                            className="w-full p-4 bg-slate-50 rounded-lg border-none resize-none text-slate-900 placeholder:text-slate-400"
                            rows={4}
                            placeholder="例：今日は影の付け方を工夫しました..."
                        />
                    </div>
                )}

                {/* Submit Button */}
                {step === 'preview' && (
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !selectedTaskBox}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <>
                                <Send className="w-5 h-5 text-black" strokeWidth={4} />
                                提出する
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    )
}
