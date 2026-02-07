'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Heart, ThumbsUp, Flame, Star, Zap, Smile, Plus } from 'lucide-react'

interface ReactionButtonProps {
    workId: string
    currentUserId: string
    initialReactions?: { type: string, count: number }[]
    onReact?: () => void
    isOwnWork?: boolean
}

const REACTION_TYPES = [
    { type: 'like', icon: ThumbsUp, label: 'いいね', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { type: 'fire', icon: Flame, label: 'すごい', color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { type: 'star', icon: Star, label: '素敵', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    { type: 'clap', icon: Zap, label: '拍手', color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { type: 'smile', icon: Smile, label: '応援', color: 'text-green-500', bg: 'bg-green-500/10' },
]

export default function ReactionButton({ workId, currentUserId, initialReactions = [], onReact, isOwnWork = false }: ReactionButtonProps) {
    const [showPicker, setShowPicker] = useState(false)
    const [optimisticReactions, setOptimisticReactions] = useState<{ type: string, count: number }[]>(initialReactions)
    const [isReacting, setIsReacting] = useState(false)

    useEffect(() => {
        setOptimisticReactions(initialReactions)
    }, [initialReactions])

    const handleReact = async (type: string) => {
        if (isReacting || isOwnWork) return
        setIsReacting(true)

        // Optimistic update
        setOptimisticReactions(prev => {
            const existing = prev.find(r => r.type === type)
            if (existing) {
                return prev.map(r => r.type === type ? { ...r, count: r.count + 1 } : r)
            } else {
                return [...prev, { type, count: 1 }]
            }
        })
        setShowPicker(false)

        try {
            const { error } = await supabase
                .from('reactions')
                .insert({
                    work_id: workId,
                    sender_id: currentUserId,
                    reaction_type: type
                })

            if (error) throw error
            if (onReact) onReact()
        } catch (error) {
            console.error('Error sending reaction:', error)
            // Revert would go here
        } finally {
            setIsReacting(false)
        }
    }

    // Sort reactions by count (descending)
    const sortedReactions = [...optimisticReactions].sort((a, b) => b.count - a.count)
    const totalReactions = optimisticReactions.reduce((sum, r) => sum + r.count, 0)

    return (
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {/* Display existing reactions */}
            {sortedReactions.map(({ type, count }) => {
                const reactionConfig = REACTION_TYPES.find(r => r.type === type)
                if (!reactionConfig) return null
                const Icon = reactionConfig.icon

                return (
                    <div
                        key={type}
                        className={`flex items-center gap-1 px-2 py-1 rounded-full backdrop-blur-md border border-white/10 shadow-sm ${isOwnWork ? 'bg-white/20' : 'bg-white/10'
                            }`}
                    >
                        <Icon className={`w-4 h-4 ${reactionConfig.color}`} />
                        <span className="text-xs font-bold text-white">{count}</span>
                    </div>
                )
            })}

            {/* Add Button (only for others' works) */}
            {!isOwnWork && (
                <div className="relative">
                    <button
                        onClick={() => setShowPicker(!showPicker)}
                        className={`flex items-center justify-center w-8 h-8 rounded-full transition backdrop-blur-md border border-white/20 shadow-sm ${totalReactions === 0
                                ? 'bg-white/20 hover:bg-white/30 text-white'
                                : 'bg-white/10 hover:bg-white/20 text-white/70 hover:text-white'
                            }`}
                        title="リアクションを追加"
                    >
                        {totalReactions === 0 ? <Smile className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    </button>

                    {showPicker && (
                        <>
                            <div
                                className="fixed inset-0 z-40"
                                onClick={() => setShowPicker(false)}
                            />
                            <div className="absolute bottom-full right-0 mb-2 p-2 bg-white rounded-full shadow-xl flex gap-1 z-50 animate-in slide-in-from-bottom-2 fade-in duration-200 whitespace-nowrap">
                                {REACTION_TYPES.map(({ type, icon: Icon, label, color }) => (
                                    <button
                                        key={type}
                                        onClick={() => handleReact(type)}
                                        className="p-2 hover:bg-slate-100 rounded-full transition group relative"
                                        title={label}
                                    >
                                        <Icon className={`w-6 h-6 ${color} transition-transform group-hover:scale-125`} />
                                        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] bg-black/80 text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none">
                                            {label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
