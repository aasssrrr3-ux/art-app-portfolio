'use client'
// Force recompile

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, Work, TaskBox, Annotation, TeacherComment } from '@/lib/supabase'
import { ChevronLeft, Folder, X, MessageCircle, Circle, Play, Pause, SkipBack, SkipForward } from 'lucide-react'
import Link from 'next/link'
import AnnotationLayer from '@/components/AnnotationLayer'
import ReactionButton from '@/components/ReactionButton'

interface WorkWithTaskBox extends Work {
    task_boxes?: TaskBox
    teacher_comments?: TeacherComment[]
}

export default function StudentPortfolioPage() {
    const router = useRouter()
    const { user, loading } = useAuth()
    const [works, setWorks] = useState<WorkWithTaskBox[]>([])
    const [groupedWorks, setGroupedWorks] = useState<Record<string, WorkWithTaskBox[]>>({})
    const [selectedWork, setSelectedWork] = useState<WorkWithTaskBox | null>(null)
    const [showAnnotation, setShowAnnotation] = useState(false)
    const [annotationCount, setAnnotationCount] = useState(0)

    // Playback State
    const [playbackWorks, setPlaybackWorks] = useState<WorkWithTaskBox[]>([])
    const [isPlaybackModalOpen, setIsPlaybackModalOpen] = useState(false)
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const [playSpeed, setPlaySpeed] = useState<1 | 2 | 4>(1)
    const playIntervalRef = useRef<NodeJS.Timeout | null>(null)

    // Reaction State
    const [currentReactions, setCurrentReactions] = useState<{ type: string, count: number }[]>([])

    // Zoom State
    const [isImageZoomed, setIsImageZoomed] = useState(false)
    const [zoomedImageUrl, setZoomedImageUrl] = useState('')

    const openZoom = (imageUrl: string) => {
        setZoomedImageUrl(imageUrl)
        setIsImageZoomed(true)
    }

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login?role=student')
        }
    }, [user, loading, router])

    useEffect(() => {
        if (user) {
            fetchMyWorks()
        }
    }, [user])

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

    // Update reactions when current work changes in playback
    useEffect(() => {
        if (isPlaybackModalOpen && playbackWorks.length > 0) {
            const work = playbackWorks[currentIndex]
            if (work) {
                fetchReactions(work.id)
            }
        }
    }, [isPlaybackModalOpen, playbackWorks, currentIndex])

    const fetchReactions = async (workId: string) => {
        try {
            const { data } = await supabase
                .from('reactions')
                .select('reaction_type')
                .eq('work_id', workId)

            if (data) {
                const counts = data.reduce((acc: any, curr) => {
                    acc[curr.reaction_type] = (acc[curr.reaction_type] || 0) + 1
                    return acc
                }, {})

                const formatted = Object.entries(counts).map(([type, count]) => ({
                    type,
                    count: count as number
                }))

                setCurrentReactions(formatted)
            } else {
                setCurrentReactions([])
            }
        } catch (error) {
            console.error('Error fetching reactions:', error)
            setCurrentReactions([])
        }
    }

    const fetchMyWorks = async () => {
        try {
            const { data } = await supabase
                .from('works')
                .select(`
                    *,
                    task_boxes (*),
                    teacher_comments (*)
                `)
                .eq('student_id', user?.id)
                .order('created_at', { ascending: false })

            if (data) {
                setWorks(data)

                // Group by unit name
                const grouped: Record<string, WorkWithTaskBox[]> = {}
                data.forEach(work => {
                    const unitName = (work.task_boxes as any)?.unit_name || '未分類'
                    if (!grouped[unitName]) {
                        grouped[unitName] = []
                    }
                    grouped[unitName].push(work)
                })
                setGroupedWorks(grouped)
            }
        } catch (error) {
            console.error('Error fetching works:', error)
        }
    }

    const startPlayback = (works: WorkWithTaskBox[]) => {
        // Sort by created_at ascending (oldest first)
        const sorted = [...works].sort((a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
        setPlaybackWorks(sorted)
        setCurrentIndex(0)
        setIsPlaybackModalOpen(true)
        setIsPlaying(true)
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

    const openWorkDetail = async (work: WorkWithTaskBox) => {
        setSelectedWork(work)

        // Fetch annotation count
        const { count } = await supabase
            .from('annotations')
            .select('*', { count: 'exact', head: true })
            .eq('work_id', work.id)

        setAnnotationCount(count || 0)
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
                <Link href="/student/home" className="back-button">
                    <ChevronLeft className="w-6 h-6 text-slate-600" />
                </Link>
                <div>
                    <p className="page-subtitle">HISTORY</p>
                    <h1 className="page-title">振り返り</h1>
                </div>
            </div>

            <div className="max-w-4xl mx-auto">
                {Object.keys(groupedWorks).length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                            <Folder className="w-10 h-10 text-slate-400" />
                        </div>
                        <p className="text-slate-500">まだ提出した作品がありません</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {Object.entries(groupedWorks).map(([unitName, unitWorks]) => (
                            <div key={unitName}>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-[#5b5fff] flex items-center justify-center">
                                        <Folder className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-slate-900">{unitName}</h2>
                                        <p className="text-xs text-slate-500">{unitWorks.length}件の作品</p>
                                    </div>
                                    <button
                                        onClick={() => startPlayback(unitWorks)}
                                        className="ml-auto flex items-center gap-1 px-3 py-1.5 bg-slate-900 text-white rounded-full text-xs font-medium hover:bg-slate-800 transition"
                                    >
                                        <Play className="w-3 h-3" />
                                        再生する
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {unitWorks.map((work, index) => (
                                        <div
                                            key={work.id}
                                            className="card-soft overflow-hidden group cursor-pointer hover:shadow-lg transition"
                                            onClick={() => openWorkDetail(work)}
                                        >
                                            <div className="relative">
                                                <img
                                                    src={work.image_url}
                                                    alt={`Work ${index + 1}`}
                                                    className="w-full aspect-square object-cover"
                                                />
                                                <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 rounded text-white text-xs">
                                                    {index + 1}枚目
                                                </div>
                                                {work.teacher_comments && work.teacher_comments.length > 0 && (
                                                    <div className="absolute top-2 right-2 px-2 py-1 bg-amber-500 rounded text-white text-xs flex items-center gap-1">
                                                        <MessageCircle className="w-3 h-3" />
                                                        {work.teacher_comments.length}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-3">
                                                <p className="text-xs text-slate-500">
                                                    {new Date(work.created_at).toLocaleDateString('ja-JP')}
                                                </p>
                                                {work.reflection && (
                                                    <p className="text-xs text-slate-700 mt-1 line-clamp-2">
                                                        {work.reflection}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Work Detail Modal */}
            {selectedWork && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-2xl max-h-[90vh] overflow-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-slate-900">作品詳細</h2>
                            <button
                                onClick={() => setSelectedWork(null)}
                                className="p-2 rounded-full hover:bg-slate-100"
                            >
                                <X className="w-6 h-6 text-slate-500" />
                            </button>
                        </div>

                        <img
                            src={selectedWork.image_url}
                            alt="Work"
                            className="w-full rounded-2xl mb-4"
                            style={{ filter: `brightness(${selectedWork.brightness || 100}%)` }}
                        />

                        {/* Annotation Button */}
                        <button
                            onClick={() => setShowAnnotation(true)}
                            className="w-full py-3 mb-4 bg-amber-100 text-amber-700 rounded-xl font-medium hover:bg-amber-200 transition flex items-center justify-center gap-2"
                        >
                            <Circle className="w-5 h-5" />
                            丸囲みコメントを見る
                            {annotationCount > 0 && (
                                <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
                                    {annotationCount}
                                </span>
                            )}
                        </button>

                        {/* Reflection */}
                        {selectedWork.reflection && (
                            <div className="bg-slate-50 rounded-xl p-4 mb-4">
                                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">感想・こだわり</p>
                                <p className="text-slate-900">{selectedWork.reflection}</p>
                            </div>
                        )}

                        {/* Teacher Comments */}
                        {selectedWork.teacher_comments && selectedWork.teacher_comments.length > 0 && (
                            <div className="bg-blue-50 rounded-xl p-4 mb-4">
                                <p className="text-xs text-blue-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <MessageCircle className="w-4 h-4" />
                                    先生からのコメント
                                </p>
                                {selectedWork.teacher_comments.map((comment, i) => (
                                    <div key={i} className="text-slate-900">
                                        {comment.comment}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Date */}
                        <p className="text-xs text-slate-400 text-center">
                            {new Date(selectedWork.created_at).toLocaleString('ja-JP')}
                        </p>
                    </div>
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
                    isOwnWork={true}
                    onClose={() => setShowAnnotation(false)}
                />
            )}
            {/* Playback Modal */}
            {isPlaybackModalOpen && playbackWorks.length > 0 && (
                <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 text-white">
                        <div>
                            <p className="text-xs text-white/60 uppercase tracking-wider">
                                {(playbackWorks[0].task_boxes as any)?.unit_name}
                            </p>
                            <h2 className="text-lg font-bold">ポートフォリオ再生</h2>
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
                                onClick={() => openZoom(playbackWorks[currentIndex].image_url)}
                            >
                                <img
                                    src={playbackWorks[currentIndex].image_url}
                                    alt="Work"
                                    className="max-h-[50vh] md:max-h-[70vh] w-auto rounded-2xl transition-transform group-hover:scale-[1.02]"
                                    style={{ filter: `brightness(${playbackWorks[currentIndex].brightness || 100}%)` }}
                                />
                                <div className="absolute bottom-4 left-4 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                                    {currentIndex + 1}回目
                                </div>

                                {/* Reaction Button Overlay */}
                                <div
                                    className="absolute bottom-4 right-4"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <ReactionButton
                                        workId={playbackWorks[currentIndex].id}
                                        currentUserId={user?.id || ''}
                                        initialReactions={currentReactions}
                                        onReact={() => fetchReactions(playbackWorks[currentIndex].id)}
                                        isOwnWork={true}
                                    />
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
            {/* Image Zoom Modal */}
            {isImageZoomed && (
                <div
                    className="fixed inset-0 z-[60] bg-black flex items-center justify-center p-4 cursor-pointer"
                    onClick={() => setIsImageZoomed(false)}
                >
                    <img
                        src={zoomedImageUrl}
                        alt="Fullscreen"
                        className="max-w-full max-h-full object-contain"
                    />
                    <p className="absolute bottom-4 text-white/50 text-sm">タップして閉じる</p>
                </div>
            )}
        </div>
    )
}
