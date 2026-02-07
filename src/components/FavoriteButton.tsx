'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Heart } from 'lucide-react'

interface FavoriteButtonProps {
    workId: string
    currentUserId: string
    onToggle?: (isFavorite: boolean) => void
}

export default function FavoriteButton({ workId, currentUserId, onToggle }: FavoriteButtonProps) {
    const [isFavorite, setIsFavorite] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    // Check initial status
    useEffect(() => {
        checkFavoriteStatus()
    }, [workId, currentUserId])

    const checkFavoriteStatus = async () => {
        try {
            const { data } = await supabase
                .from('favorites')
                .select('created_at')
                .eq('user_id', currentUserId)
                .eq('work_id', workId)
                .maybeSingle()

            setIsFavorite(!!data)
        } catch (error) {
            console.error('Error checking behavior:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const toggleFavorite = async () => {
        if (isLoading) return

        // Optimistic update
        const newState = !isFavorite
        setIsFavorite(newState)

        try {
            if (newState) {
                // Add to favorites
                const { error } = await supabase
                    .from('favorites')
                    .insert({
                        user_id: currentUserId,
                        work_id: workId
                    })
                if (error) throw error
            } else {
                // Remove from favorites
                const { error } = await supabase
                    .from('favorites')
                    .delete()
                    .eq('user_id', currentUserId)
                    .eq('work_id', workId)
                if (error) throw error
            }

            if (onToggle) onToggle(newState)
        } catch (error) {
            console.error('Error toggling favorite:', error)
            setIsFavorite(!newState) // Revert
        }
    }

    if (isLoading) {
        return (
            <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
        )
    }

    return (
        <button
            onClick={toggleFavorite}
            className={`p-2.5 rounded-full transition backdrop-blur-sm border ${isFavorite
                    ? 'bg-pink-500/90 border-pink-500 text-white hover:bg-pink-600'
                    : 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
                }`}
            title={isFavorite ? 'お気に入りから削除' : 'お気に入りに保存'}
        >
            <Heart className={`w-6 h-6 ${isFavorite ? 'fill-white' : ''}`} />
        </button>
    )
}
