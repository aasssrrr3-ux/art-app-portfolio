'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, Work, SharedResource, Class, TaskBox, TeacherComment } from '@/lib/supabase'
import { ChevronLeft, Users, FileImage, Play, Pause, SkipBack, SkipForward, X, Camera, Circle } from 'lucide-react'
import Link from 'next/link'
import AnnotationLayer from '@/components/AnnotationLayer'
import ReactionButton from '@/components/ReactionButton'
import FavoriteButton from '@/components/FavoriteButton'

interface WorkWithUser extends Work {
    users?: { name: string; id: string }
    task_boxes?: TaskBox
    teacher_comments?: TeacherComment[]
}

interface GroupedStudent {
    studentId: string
    studentName: string
    latestWork: WorkWithUser
    allWorks: WorkWithUser[]
    totalCount: number
}

export default function StudentGalleryPage() {
    const router = useRouter()
    const { user, loading } = useAuth()
    const [activeTab, setActiveTab] = useState<'students' | 'resources'>('students')
    const [classes, setClasses] = useState<Class[]>([])
    const [selectedClass, setSelectedClass] = useState<Class | null>(null)
    const [groupedStudents, setGroupedStudents] = useState<GroupedStudent[]>([])
    const [resources, setResources] = useState<SharedResource[]>([])

    // Portfolio Playback Modal State
    const [selectedStudent, setSelectedStudent] = useState<GroupedStudent | null>(null)
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const [playSpeed, setPlaySpeed] = useState<1 | 2 | 4>(1)
    const playIntervalRef = useRef<NodeJS.Timeout | null>(null)

    // Image Zoom State
    const [isImageZoomed, setIsImageZoomed] = useState(false)
    const [zoomedImageUrl, setZoomedImageUrl] = useState('')

    // Resource Detail State
    const [selectedResource, setSelectedResource] = useState<SharedResource | null>(null)

    // Annotation State
    const [showAnnotation, setShowAnnotation] = useState(false)

    // Reaction State
    const [currentReactions, setCurrentReactions] = useState<{ type: string, count: number }[]>([])

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
            if (activeTab === 'students') {
                fetchClassmatesWorks()
            } else {
                fetchSharedResources()
            }
        }
    }, [selectedClass, activeTab])

    // Playback control
    useEffect(() => {
        if (isPlaying && selectedStudent) {
            playIntervalRef.current = setInterval(() => {
                setCurrentIndex(prev => {
                    if (prev >= selectedStudent.allWorks.length - 1) {
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
    }, [isPlaying, playSpeed, selectedStudent])

    // Update reactions when current work changes
    useEffect(() => {
        if (selectedStudent) {
            const work = selectedStudent.allWorks[currentIndex]
            if (work) {
                fetchReactions(work.id)
            }
        }
    }, [selectedStudent, currentIndex])

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

    const fetchClassmatesWorks = async () => {
        if (!selectedClass) return
        try {
            // Get task boxes for this class
            const { data: taskBoxes } = await supabase
                .from('task_boxes')
                .select('id')
                .eq('class_id', selectedClass.id)

            if (!taskBoxes || taskBoxes.length === 0) {
                setGroupedStudents([])
                return
            }

            const taskBoxIds = taskBoxes.map(t => t.id)

            // Get works for these task boxes with task box info and comments
            const { data: worksData } = await supabase
                .from('works')
                .select(`
                    *,
                    users:student_id (name, id),
                    task_boxes:task_box_id (unit_name, task_name),
                    teacher_comments (comment, created_at)
                `)
                .in('task_box_id', taskBoxIds)
                .order('created_at', { ascending: false })

            if (!worksData || worksData.length === 0) {
                setGroupedStudents([])
                return
            }

            // Group works by student
            const studentMap = new Map<string, WorkWithUser[]>()
            worksData.forEach(work => {
                const studentId = work.student_id
                if (!studentMap.has(studentId)) {
                    studentMap.set(studentId, [])
                }
                studentMap.get(studentId)!.push(work as WorkWithUser)
            })

            // Create grouped student array
            const grouped: GroupedStudent[] = []
            studentMap.forEach((works, studentId) => {
                // Sort by created_at descending (latest first)
                works.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

                grouped.push({
                    studentId,
                    studentName: (works[0].users as any)?.name || '匿名',
                    latestWork: works[0],
                    allWorks: works.reverse(), // Oldest first for playback
                    totalCount: works.length
                })
            })

            // Sort: own works first, then by latest work date
            grouped.sort((a, b) => {
                if (a.studentId === user?.id) return -1
                if (b.studentId === user?.id) return 1
                return new Date(b.latestWork.created_at).getTime() - new Date(a.latestWork.created_at).getTime()
            })

            setGroupedStudents(grouped)
        } catch (error) {
            console.error('Error fetching works:', error)
        }
    }

    const fetchSharedResources = async () => {
        if (!selectedClass) return
        try {
            const { data } = await supabase
                .from('shared_resources')
                .select('*')
                .eq('class_id', selectedClass.id)
                .order('created_at', { ascending: false })

            setResources(data || [])
        } catch (error) {
            console.error('Error fetching resources:', error)
        }
    }

    const openPlaybackModal = (student: GroupedStudent) => {
        setSelectedStudent(student)
        setCurrentIndex(student.allWorks.length - 1) // Start at latest
        setIsPlaying(false)
    }

    const closePlaybackModal = () => {
        setSelectedStudent(null)
        setIsPlaying(false)
        setCurrentIndex(0)
    }

    const togglePlayback = () => {
        if (!selectedStudent) return
        if (currentIndex >= selectedStudent.allWorks.length - 1) {
            // Reset to beginning if at end
            setCurrentIndex(0)
        }
        setIsPlaying(!isPlaying)
    }

    const goToPrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1)
            setIsPlaying(false)
        }
    }

    const goToNext = () => {
        if (selectedStudent && currentIndex < selectedStudent.allWorks.length - 1) {
            setCurrentIndex(prev => prev + 1)
            setIsPlaying(false)
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

    const currentWork = selectedStudent?.allWorks[currentIndex]

    return (
        <div className="min-h-screen p-4 md:p-8">
            {/* Header */}
            <div className="page-header mb-6">
                <Link href="/student/home" className="back-button">
                    <ChevronLeft className="w-6 h-6 text-slate-600" />
                </Link>
                <div>
                    <p className="page-subtitle">GALLERY</p>
                    <h1 className="page-title">みんなのギャラリー</h1>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 max-w-2xl mx-auto">
                <button
                    onClick={() => setActiveTab('students')}
                    className={`flex-1 py-3 px-4 rounded-xl font-medium transition flex items-center justify-center gap-2 ${activeTab === 'students'
                        ? 'bg-[#5b5fff] text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                >
                    <Users className="w-5 h-5" />
                    生徒ギャラリー
                </button>
                <button
                    onClick={() => setActiveTab('resources')}
                    className={`flex-1 py-3 px-4 rounded-xl font-medium transition flex items-center justify-center gap-2 ${activeTab === 'resources'
                        ? 'bg-[#5b5fff] text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                >
                    <FileImage className="w-5 h-5" />
                    共有資料
                </button>
            </div>

            {/* Class Filter */}
            <div className="flex gap-2 mb-6 max-w-2xl mx-auto overflow-x-auto pb-2">
                {classes.map(cls => (
                    <button
                        key={cls.id}
                        onClick={() => setSelectedClass(cls)}
                        className={`px-4 py-2 rounded-full whitespace-nowrap transition ${selectedClass?.id === cls.id
                            ? 'bg-slate-900 text-white'
                            : 'bg-white text-slate-600 hover:bg-slate-100'
                            }`}
                    >
                        {cls.name}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto">
                {activeTab === 'students' ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {groupedStudents.length === 0 ? (
                            <div className="col-span-full text-center py-12 text-slate-500">
                                まだ作品がありません
                            </div>
                        ) : (
                            groupedStudents.map(student => {
                                const isOwnWork = student.studentId === user?.id
                                return (
                                    <button
                                        key={student.studentId}
                                        onClick={() => openPlaybackModal(student)}
                                        className={`card-soft overflow-hidden text-left hover:shadow-xl transition relative ${isOwnWork ? 'ring-4 ring-[#5b5fff]' : ''
                                            }`}
                                    >
                                        {isOwnWork && (
                                            <div className="absolute top-2 right-2 px-2 py-1 bg-[#5b5fff] rounded-full text-white text-xs font-bold z-10">
                                                MY WORK
                                            </div>
                                        )}
                                        <img
                                            src={student.latestWork.image_url}
                                            alt="Work"
                                            className="w-full aspect-square object-cover"
                                            style={{ filter: `brightness(${student.latestWork.brightness || 100}%)` }}
                                        />
                                        <div className="p-4">
                                            <p className={`font-medium text-sm ${isOwnWork ? 'text-[#5b5fff]' : 'text-slate-900'}`}>
                                                {isOwnWork ? 'わたしの作品' : student.studentName}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1">
                                                {(student.latestWork.task_boxes as any)?.unit_name} - {(student.latestWork.task_boxes as any)?.task_name}
                                            </p>
                                            <div className="flex items-center gap-1 mt-2 text-xs text-[#5b5fff]">
                                                <Camera className="w-3 h-3" />
                                                <span>{student.totalCount}件の記録</span>
                                            </div>
                                        </div>
                                    </button>
                                )
                            })
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {resources.length === 0 ? (
                            <div className="col-span-full text-center py-12 text-slate-500">
                                共有された資料はありません
                            </div>
                        ) : (
                            resources.map(resource => (
                                <button
                                    key={resource.id}
                                    onClick={() => setSelectedResource(resource)}
                                    className="card-soft overflow-hidden text-left hover:shadow-xl transition"
                                >
                                    <img
                                        src={resource.image_url}
                                        alt={resource.title}
                                        className="w-full aspect-square object-cover"
                                    />
                                    <div className="p-4">
                                        <p className="font-medium text-slate-900 text-sm">
                                            {resource.title}
                                        </p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Portfolio Playback Modal */}
            {selectedStudent && currentWork && (
                <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 text-white">
                        <div>
                            <p className="text-xs text-white/60 uppercase tracking-wider">
                                {(currentWork.task_boxes as any)?.unit_name}
                            </p>
                            <h2 className="text-lg font-bold">{selectedStudent.studentName}</h2>
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
                                    />
                                </div>

                                <div className="absolute bottom-4 left-4 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                                    {currentIndex + 1}回目
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
                            {/* Playback Controls */}
                            <div className="bg-slate-900 rounded-2xl p-4">
                                <div className="flex items-center justify-center gap-4 mb-4">
                                    <button
                                        onClick={goToPrev}
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
                                        onClick={goToNext}
                                        disabled={currentIndex >= selectedStudent.allWorks.length - 1}
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
                                        <span className="text-white/60">/{selectedStudent.allWorks.length}</span>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="mt-4 flex gap-1">
                                    {selectedStudent.allWorks.map((_, idx) => (
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
                            {currentWork.reflection && (
                                <div className="bg-white rounded-2xl p-4">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                                        SELF REFLECTION
                                    </p>
                                    <p className="text-slate-900 text-sm">{currentWork.reflection}</p>
                                </div>
                            )}

                            {/* Teacher Comment */}
                            {currentWork.teacher_comments && currentWork.teacher_comments.length > 0 && (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                                    <p className="text-xs text-emerald-600 uppercase tracking-wider mb-2">
                                        TEACHER'S ADVICE
                                    </p>
                                    <p className="text-slate-900 text-sm">
                                        {currentWork.teacher_comments[0].comment}
                                    </p>
                                </div>
                            )}

                            {/* Annotation Button */}
                            <button
                                onClick={() => setShowAnnotation(true)}
                                className="w-full py-3 bg-amber-100 text-amber-700 rounded-xl font-medium hover:bg-amber-200 transition flex items-center justify-center gap-2"
                            >
                                <Circle className="w-5 h-5" />
                                丸囲みコメント
                            </button>

                            {/* Submission Date */}
                            <p className="text-xs text-white/40 text-center">
                                {new Date(currentWork.created_at).toLocaleString('ja-JP')}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Resource Detail Modal */}
            {selectedResource && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-2xl max-h-[90vh] overflow-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-slate-900">{selectedResource.title}</h2>
                            <button
                                onClick={() => setSelectedResource(null)}
                                className="p-2 rounded-full hover:bg-slate-100"
                            >
                                <X className="w-6 h-6 text-slate-500" />
                            </button>
                        </div>

                        <div
                            className="relative cursor-pointer group"
                            onClick={() => openZoom(selectedResource.image_url)}
                        >
                            <img
                                src={selectedResource.image_url}
                                alt={selectedResource.title}
                                className="w-full rounded-2xl transition-transform group-hover:scale-[1.01]"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors rounded-2xl">
                                <span className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 px-3 py-1 rounded-full">
                                    タップで拡大
                                </span>
                            </div>
                        </div>

                        <p className="text-xs text-slate-400 mt-4 text-center">
                            共有日時: {new Date(selectedResource.created_at).toLocaleString('ja-JP')}
                        </p>
                    </div>
                </div>
            )}

            {/* Fullscreen Image Zoom */}
            {isImageZoomed && (
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
                        src={zoomedImageUrl}
                        alt="Fullscreen"
                        className="max-w-full max-h-full object-contain"
                    />
                    <p className="absolute bottom-4 text-white/50 text-sm">タップして閉じる</p>
                </div>
            )}

            {/* Annotation Layer */}
            {showAnnotation && selectedStudent && user && (
                <AnnotationLayer
                    workId={selectedStudent.allWorks[currentIndex].id}
                    imageUrl={selectedStudent.allWorks[currentIndex].image_url}
                    brightness={selectedStudent.allWorks[currentIndex].brightness}
                    canEdit={true}
                    userId={user.id}
                    isOwnWork={selectedStudent.studentId === user.id}
                    onClose={() => setShowAnnotation(false)}
                />
            )}
        </div>
    )
}
