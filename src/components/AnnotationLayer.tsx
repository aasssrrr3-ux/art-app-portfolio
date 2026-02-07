'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase, Annotation } from '@/lib/supabase'
import { Circle, X, Send, Trash2 } from 'lucide-react'

interface AnnotationLayerProps {
    workId: string
    imageUrl: string
    brightness?: number
    canEdit: boolean
    userId: string
    isOwnWork?: boolean  // 自分の作品かどうか
    onClose?: () => void
}

export default function AnnotationLayer({
    workId,
    imageUrl,
    brightness = 100,
    canEdit,
    userId,
    isOwnWork = false,
    onClose
}: AnnotationLayerProps) {
    // 自分の作品には丸囲みコメントを追加できない
    const canAddAnnotation = canEdit && !isOwnWork
    const containerRef = useRef<HTMLDivElement>(null)
    const [annotations, setAnnotations] = useState<Annotation[]>([])
    const [isAdding, setIsAdding] = useState(false)
    const [newAnnotation, setNewAnnotation] = useState<{ x: number, y: number } | null>(null)
    const [commentText, setCommentText] = useState('')
    const [selectedColor, setSelectedColor] = useState('#FF4444')
    const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null)
    const [loading, setLoading] = useState(true)

    const colors = ['#FF4444', '#44FF44', '#4444FF', '#FFFF44', '#FF44FF', '#44FFFF']

    useEffect(() => {
        fetchAnnotations()
    }, [workId])

    const fetchAnnotations = async () => {
        try {
            const { data } = await supabase
                .from('annotations')
                .select('*')
                .eq('work_id', workId)
                .order('created_at', { ascending: true })

            setAnnotations(data || [])
        } catch (error) {
            console.error('Error fetching annotations:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isAdding || !containerRef.current) return

        const rect = containerRef.current.getBoundingClientRect()
        const x = ((e.clientX - rect.left) / rect.width) * 100
        const y = ((e.clientY - rect.top) / rect.height) * 100

        setNewAnnotation({ x, y })
    }

    const saveAnnotation = async () => {
        if (!newAnnotation) return

        try {
            const { data, error } = await supabase
                .from('annotations')
                .insert({
                    work_id: workId,
                    user_id: userId,
                    x_percent: newAnnotation.x,
                    y_percent: newAnnotation.y,
                    radius_percent: 5,
                    comment: commentText || null,
                    color: selectedColor
                })
                .select()
                .single()

            if (error) throw error

            setAnnotations(prev => [...prev, data])
            setNewAnnotation(null)
            setCommentText('')
            setIsAdding(false)
        } catch (error) {
            console.error('Error saving annotation:', error)
        }
    }

    const deleteAnnotation = async (id: string) => {
        try {
            await supabase.from('annotations').delete().eq('id', id)
            setAnnotations(prev => prev.filter(a => a.id !== id))
            setSelectedAnnotation(null)
        } catch (error) {
            console.error('Error deleting annotation:', error)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 text-white">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-bold">丸囲みコメント</h2>
                    {canAddAnnotation && (
                        <button
                            onClick={() => {
                                setIsAdding(!isAdding)
                                setNewAnnotation(null)
                            }}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition ${isAdding
                                ? 'bg-red-500 text-white'
                                : 'bg-[#5b5fff] text-white hover:bg-[#4a4eee]'
                                }`}
                        >
                            <Circle className="w-4 h-4 inline mr-2" />
                            {isAdding ? 'キャンセル' : '丸を追加'}
                        </button>
                    )}
                    {isOwnWork && (
                        <span className="text-white/50 text-sm">
                            （閲覧のみ）
                        </span>
                    )}
                </div>
                <button
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-white/10 transition"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Instructions */}
            {isAdding && !newAnnotation && (
                <div className="text-center text-white/80 py-2 bg-[#5b5fff]/30">
                    画像をクリックして丸を配置してください
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
                <div
                    ref={containerRef}
                    className={`relative max-w-full max-h-full ${isAdding ? 'cursor-crosshair' : ''}`}
                    onClick={handleImageClick}
                >
                    <img
                        src={imageUrl}
                        alt="Work"
                        className="max-h-[70vh] w-auto rounded-xl"
                        style={{ filter: `brightness(${brightness}%)` }}
                        draggable={false}
                    />

                    {/* Existing Annotations */}
                    {annotations.map(ann => (
                        <div
                            key={ann.id}
                            className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-110"
                            style={{
                                left: `${ann.x_percent}%`,
                                top: `${ann.y_percent}%`,
                            }}
                            onClick={(e) => {
                                e.stopPropagation()
                                setSelectedAnnotation(ann)
                            }}
                        >
                            <div
                                className="rounded-full border-4 animate-pulse"
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    borderColor: ann.color,
                                    backgroundColor: `${ann.color}20`
                                }}
                            />
                            {ann.comment && (
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 whitespace-nowrap">
                                    <span className="bg-black/80 text-white text-xs px-2 py-1 rounded">
                                        {ann.comment.length > 20 ? ann.comment.slice(0, 20) + '...' : ann.comment}
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* New Annotation Preview */}
                    {newAnnotation && (
                        <div
                            className="absolute transform -translate-x-1/2 -translate-y-1/2"
                            style={{
                                left: `${newAnnotation.x}%`,
                                top: `${newAnnotation.y}%`,
                            }}
                        >
                            <div
                                className="rounded-full border-4 animate-pulse"
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    borderColor: selectedColor,
                                    backgroundColor: `${selectedColor}40`
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* New Annotation Form */}
            {newAnnotation && (
                <div className="p-4 bg-slate-900 border-t border-slate-700">
                    <div className="max-w-md mx-auto space-y-4">
                        {/* Color Selection */}
                        <div className="flex items-center gap-2">
                            <span className="text-white/60 text-sm">色:</span>
                            {colors.map(color => (
                                <button
                                    key={color}
                                    onClick={() => setSelectedColor(color)}
                                    className={`w-8 h-8 rounded-full border-2 transition ${selectedColor === color ? 'border-white scale-110' : 'border-transparent'
                                        }`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>

                        {/* Comment Input */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="コメント（任意）"
                                className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-[#5b5fff]"
                            />
                            <button
                                onClick={saveAnnotation}
                                className="px-6 py-2 bg-[#5b5fff] text-white rounded-lg hover:bg-[#4a4eee] transition flex items-center gap-2"
                            >
                                <Send className="w-4 h-4" />
                                保存
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Selected Annotation Detail */}
            {selectedAnnotation && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]" onClick={() => setSelectedAnnotation(null)}>
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4">
                            <div
                                className="w-6 h-6 rounded-full"
                                style={{ backgroundColor: selectedAnnotation.color }}
                            />
                            <h3 className="font-bold text-slate-900">コメント詳細</h3>
                        </div>

                        {selectedAnnotation.comment ? (
                            <p className="text-slate-700 mb-4">{selectedAnnotation.comment}</p>
                        ) : (
                            <p className="text-slate-400 italic mb-4">コメントなし</p>
                        )}

                        <p className="text-xs text-slate-400 mb-4">
                            {new Date(selectedAnnotation.created_at).toLocaleString('ja-JP')}
                        </p>

                        <div className="flex gap-2">
                            <button
                                onClick={() => setSelectedAnnotation(null)}
                                className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
                            >
                                閉じる
                            </button>
                            {canEdit && (
                                <button
                                    onClick={() => deleteAnnotation(selectedAnnotation.id)}
                                    className="py-2 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center gap-1"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    削除
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Annotation Count */}
            <div className="p-2 text-center text-white/50 text-sm">
                {annotations.length}件のマーク
            </div>
        </div>
    )
}
