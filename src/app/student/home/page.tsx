'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, Class } from '@/lib/supabase'
import { Camera, Share2, Clock, ChevronDown, UserPlus, Heart } from 'lucide-react'
import Link from 'next/link'

export default function StudentHomePage() {
    const router = useRouter()
    const { user, loading } = useAuth()
    const [classes, setClasses] = useState<Class[]>([])
    const [selectedClass, setSelectedClass] = useState<Class | null>(null)
    const [showDropdown, setShowDropdown] = useState(false)
    const [isFetchingClasses, setIsFetchingClasses] = useState(true) // Start true

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login?role=student')
        } else if (!loading && user?.role !== 'student') {
            router.push('/teacher/home')
        }
    }, [user, loading, router])

    useEffect(() => {
        if (user) {
            fetchClasses()
        } else if (!loading) {
            // No user and not loading (logged out?), stop fetching
            setIsFetchingClasses(false)
        }
    }, [user, loading])

    const fetchClasses = async () => {
        setIsFetchingClasses(true)
        try {
            if (!user) return

            const { data: memberships, error: memberError } = await supabase
                .from('class_members')
                .select('class_id')
                .eq('user_id', user.id)

            if (memberError) throw memberError

            if (memberships && memberships.length > 0) {
                const classIds = memberships.map(m => m.class_id)
                const { data: classData, error: classError } = await supabase
                    .from('classes')
                    .select('*')
                    .in('id', classIds)

                if (classError) throw classError
                setClasses(classData || [])
                if (classData && classData.length > 0) {
                    setSelectedClass(classData[0])
                }
            } else {
                setClasses([])
            }
        } catch (error) {
            console.error('Error fetching classes:', error)
        } finally {
            setIsFetchingClasses(false)
        }
    }





    // Show loading spinner while checking auth OR fetching classes
    if (loading || (user && isFetchingClasses)) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-[#5b5fff] border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <p className="page-subtitle">WELCOME!</p>
                    <h1 className="text-2xl font-bold text-slate-900">
                        {user?.name || 'ゲスト'}さん
                    </h1>
                </div>

                <div className="flex items-center gap-4 pr-48">
                    {/* Favorites Link */}
                    <Link href="/student/favorites">
                        <button className="p-2 rounded-full hover:bg-slate-100 transition text-slate-400 hover:text-pink-500">
                            <Heart className="w-6 h-6" />
                        </button>
                    </Link>

                    {/* Class Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowDropdown(!showDropdown)}
                            className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
                        >
                            <span>{selectedClass?.name || 'クラス未所属'}</span>
                            <ChevronDown className="w-4 h-4" />
                        </button>

                        {showDropdown && classes.length > 0 && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-10">
                                {classes.map((cls) => (
                                    <button
                                        key={cls.id}
                                        onClick={() => {
                                            setSelectedClass(cls)
                                            setShowDropdown(false)
                                        }}
                                        className="w-full px-4 py-3 text-left text-slate-700 hover:bg-slate-50 first:rounded-t-lg last:rounded-b-lg"
                                    >
                                        {cls.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {/* クラス未参加の場合 */}
            {classes.length === 0 ? (
                <div className="max-w-md mx-auto text-center py-16">
                    <div className="w-20 h-20 rounded-full bg-[#5b5fff]/10 flex items-center justify-center mx-auto mb-6">
                        <UserPlus className="w-10 h-10 text-[#5b5fff]" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">クラスに所属していません</h2>
                    <p className="text-slate-500 mb-6">先生にクラスへの招待を依頼してください</p>
                </div>
            ) : (
                /* Main Menu */
                <div className="max-w-xl mx-auto space-y-6">
                    {/* Camera - Primary Action */}
                    <Link href="/student/submit" className="block">
                        <div className="menu-card active py-12">
                            <Camera className="w-12 h-12 mb-4" />
                            <h2 className="text-2xl font-bold mb-1">作品を撮る</h2>
                            <p className="text-sm opacity-80 uppercase tracking-wider">CAMERA</p>
                        </div>
                    </Link>

                    {/* Gallery */}
                    <Link href="/student/gallery" className="block">
                        <div className="menu-card">
                            <Share2 className="w-10 h-10 text-[#5b5fff] mb-4" />
                            <h2 className="text-xl font-bold text-slate-900 mb-1">みんなのギャラリー</h2>
                            <p className="text-xs text-slate-400 uppercase tracking-wider">GALLERY</p>
                        </div>
                    </Link>

                    {/* History */}
                    <Link href="/student/portfolio" className="block">
                        <div className="menu-card">
                            <Clock className="w-10 h-10 text-[#5b5fff] mb-4" />
                            <h2 className="text-xl font-bold text-slate-900 mb-1">振り返り</h2>
                            <p className="text-xs text-slate-400 uppercase tracking-wider">HISTORY</p>
                        </div>
                    </Link>
                </div>
            )}

            {/* Footer */}
            <p className="text-center text-slate-400 text-xs uppercase tracking-widest mt-16">
                ART EDUCATION SYSTEM V1.0
            </p>


        </div>
    )
}
