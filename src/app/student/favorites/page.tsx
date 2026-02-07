'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, Work, TaskBox, TeacherComment } from '@/lib/supabase'
import { ChevronLeft, X, Play, Pause, SkipBack, SkipForward, Camera } from 'lucide-react'
import Link from 'next/link'
import AnnotationLayer from '@/components/AnnotationLayer'
import ReactionButton from '@/components/ReactionButton'
import FavoriteButton from '@/components/FavoriteButton'

interface WorkWithUser extends Work {
    users?: { name: string; id: string }
    task_boxes?: TaskBox
    teacher_comments?: TeacherComment[]
    student_id: string // Ensure this is available
}

export default function StudentFavoritesPage() {
    const router = useRouter()
    const { user, loading } = useAuth()

    const [favorites, setFavorites] = useState<WorkWithUser[]>([])

    // Playback Modal State
    const [selectedWorkIndex, setSelectedWorkIndex] = useState<number | null>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [playSpeed, setPlaySpeed] = useState<1 | 2 | 4>(1)
    const playIntervalRef = useRef<NodeJS.Timeout | null>(null)

    // Annotation State
    const [showAnnotation, setShowAnnotation] = useState(false)

    // Reaction State
    const [currentReactions, setCurrentReactions] = useState<{ type: string, count: number }[]>([])

    // Zoom State
    const [isImageZoomed, setIsImageZoomed] = useState(false)
    const [zoomedImageUrl, setZoomedImageUrl] = useState('')

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login?role=student')
        }
    }, [user, loading, router])

    useEffect(() => {
        if (user) {
            fetchFavorites()
        }
    }, [user])

    // Update reactions when current work changes
    useEffect(() => {
        if (selectedWorkIndex !== null) {
            const work = favorites[selectedWorkIndex]
            if (work) {
                fetchReactions(work.id)
            }
        }
    }, [selectedWorkIndex, favorites])

    const fetchFavorites = async () => {
        try {
            const { data: favoriteData } = await supabase
                .from('favorites')
                .select('work_id')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false })

            if (!favoriteData || favoriteData.length === 0) {
                setFavorites([])
                return
            }

            const workIds = favoriteData.map(f => f.work_id)

            const { data: worksData } = await supabase
                .from('works')
                .select(`
                    *,
                    users:student_id (name, id),
                    task_boxes:task_box_id (unit_name, task_name),
                    teacher_comments (comment, created_at)
                `)
                .in('id', workIds)

            // Sort by favorite order (descending)
            if (worksData) {
                const sorted = worksData.sort((a, b) => {
                    return workIds.indexOf(a.id) - workIds.indexOf(b.id)
                })
                setFavorites(sorted as WorkWithUser[])
            }
        } catch (error) {
            console.error('Error fetching favorites:', error)
        }
    }

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

    const openPlaybackModal = (index: number) => {
        setSelectedWorkIndex(index)
        setIsPlaying(false)
    }

    const closePlaybackModal = () => {
        setSelectedWorkIndex(null)
        setIsPlaying(false)
    }

    const togglePlayback = () => {
        if (selectedWorkIndex === null) return
        if (selectedWorkIndex >= favorites.length - 1) {
            setSelectedWorkIndex(0)
        }
        setIsPlaying(!isPlaying)
    }

    // Playback control (Auto-play through favorites list? Maybe not appropriate, but keep logic for consistency if needed)
    // Actually, for favorites flow, maybe better to just show ONE work or navigate prev/next.
    // Let's implement Prev/Next navigation logic.
    const goToPrev = () => {
        if (selectedWorkIndex !== null && selectedWorkIndex > 0) {
            setSelectedWorkIndex(prev => prev! - 1)
        }
    }

    const goToNext = () => {
        if (selectedWorkIndex !== null && selectedWorkIndex < favorites.length - 1) {
            setSelectedWorkIndex(prev => prev! + 1)
        }
    }

    const openZoom = (imageUrl: string) => {
        setZoomedImageUrl(imageUrl)
        setIsImageZoomed(true)
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-[#5b5fff] border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    const currentWork = selectedWorkIndex !== null ? favorites[selectedWorkIndex] : null

    return (
        <div className="min-h-screen p-4 md:p-8">
            {/* Header */}
            <div className="page-header mb-6">
                <Link href="/student/home" className="back-button">
                    <ChevronLeft className="w-6 h-6 text-slate-600" />
                </Link>
                <div>
                    <p className="page-subtitle">FAVORITES</p>
                    <h1 className="page-title">お気に入り</h1>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {favorites.length === 0 ? (
                        <div className="col-span-full text-center py-12 text-slate-500">
                            まだお気に入りの作品がありません
                        </div>
                    ) : (
                        favorites.map((work, index) => {
                            const isOwnWork = work.student_id === user?.id
                            return (
                                <button
                                    key={work.id}
                                    onClick={() => openPlaybackModal(index)}
                                    className={`card-soft overflow-hidden text-left hover:shadow-xl transition relative group ${isOwnWork ? 'ring-2 ring-[#5b5fff] ring-offset-2' : ''
                                        }`}
                                >
                                    <div className="relative">
                                        <img
                                            src={work.image_url}
                                            alt="Work"
                                            className="w-full aspect-square object-cover"
                                            style={{ filter: `brightness(${work.brightness || 100}%)` }}
                                        />
                                        {isOwnWork && (
                                            <div className="absolute top-2 right-2 bg-[#5b5fff] text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md z-10">
                                                MY WORK
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4">
                                        <p className="font-medium text-slate-900 text-sm">
                                            {(work.users as any)?.name}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-1">
                                            {(work.task_boxes as any)?.unit_name} - {(work.task_boxes as any)?.task_name}
                                        </p>
                                    </div>
                                </button>
                            )
                        })
                    )}
                </div>
            </div>

            {/* Modal */}
            {currentWork && (
                <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 text-white">
                        <div>
                            <p className="text-xs text-white/60 uppercase tracking-wider">
                                {(currentWork.task_boxes as any)?.unit_name}
                            </p>
                            <h2 className="text-lg font-bold">{(currentWork.users as any)?.name}</h2>
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
                                onClick={() => openZoom(currentWork.image_url)}
                            >
                                <img
                                    src={currentWork.image_url}
                                    alt="Work"
                                    className="max-h-[50vh] md:max-h-[70vh] w-auto rounded-2xl transition-transform group-hover:scale-[1.02]"
                                    style={{ filter: `brightness(${currentWork.brightness || 100}%)` }}
                                />

                                {/* Favorite Button Overlay */}
                                <div
                                    className="absolute top-4 right-4 z-10"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <FavoriteButton
                                        workId={currentWork.id}
                                        currentUserId={user?.id || ''}
                                        onToggle={() => {
                                            // Optional: remove from list immediately or just toggle state
                                            // For better UX, maybe keep it until refresh
                                        }}
                                    />
                                </div>

                                {/* Reaction Button Overlay */}
                                <div
                                    className="absolute bottom-4 right-4"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <ReactionButton
                                        workId={currentWork.id}
                                        currentUserId={user?.id || ''}
                                        initialReactions={currentReactions}
                                        onReact={() => fetchReactions(currentWork.id)}
                                        isOwnWork={currentWork.student_id === user?.id}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Controls & Info Panel */}
                        <div className="md:w-80 space-y-4">
                            {/* Navigation Controls */}
                            <div className="bg-slate-900 rounded-2xl p-4">
                                <div className="flex items-center justify-center gap-4 mb-4">
                                    <button
                                        onClick={goToPrev}
                                        disabled={selectedWorkIndex === 0}
                                        className="p-3 rounded-full hover:bg-white/10 disabled:opacity-30 transition"
                                    >
                                        <SkipBack className="w-6 h-6 text-white" />
                                    </button>

                                    <span className="text-white font-bold">
                                        {selectedWorkIndex! + 1} / {favorites.length}
                                    </span>

                                    <button
                                        onClick={goToNext}
                                        disabled={selectedWorkIndex === favorites.length - 1}
                                        className="p-3 rounded-full hover:bg-white/10 disabled:opacity-30 transition"
                                    >
                                        <SkipForward className="w-6 h-6 text-white" />
                                    </button>
                                </div>
                            </div>

                            {/* Reflection */}
                            {currentWork.reflection && (
                                <div className="bg-white rounded-2xl p-4">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                                        感想・こだわり
                                    </p>
                                    <p className="text-slate-900 text-sm">{currentWork.reflection}</p>
                                </div>
                            )}

                            {/* Teacher Comment */}
                            {currentWork.teacher_comments && currentWork.teacher_comments.length > 0 && (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                                    <p className="text-xs text-emerald-600 uppercase tracking-wider mb-2">
                                        先生からのコメント
                                    </p>
                                    <p className="text-slate-900 text-sm">
                                        {currentWork.teacher_comments[0].comment}
                                    </p>
                                </div>
                            )}

                            {/* Annotation Button */}
                            <button
                                onClick={() => setShowAnnotation(true)}
                                className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white text-sm font-medium transition flex items-center justify-center gap-2"
                            >
                                <div className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center">
                                    <div className="w-2 h-2 bg-white rounded-full" />
                                </div>
                                丸囲みコメントを見る/書く
                            </button>

                            {/* Date */}
                            <p className="text-xs text-white/40 text-center">
                                {new Date(currentWork.created_at).toLocaleString('ja-JP')}
                            </p>
                        </div>
                    </div>

                    {/* Annotation Layer */}
                    {showAnnotation && user && (
                        <AnnotationLayer
                            workId={currentWork.id}
                            imageUrl={currentWork.image_url}
                            brightness={currentWork.brightness}
                            canEdit={true}
                            userId={user.id}
                            isOwnWork={(currentWork as any).student_id === user.id}
                            onClose={() => setShowAnnotation(false)}
                        />
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
            )}
        </div>
    )
}
