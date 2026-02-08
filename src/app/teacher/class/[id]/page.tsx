/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, Class } from '@/lib/supabase'
import { ChevronLeft, Users, Upload, UserPlus, Copy, Check, FileSpreadsheet, X, Download, Settings, Key, UserMinus, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import * as XLSX from 'xlsx'

interface ClassMemberWithUser {
    id: string
    user_id: string
    class_id: string
    student_number: number
    users?: { name: string; email: string }
}

interface StudentData {
    email: string
    name: string
    number: number
}

export default function TeacherClassDetailPage() {
    const router = useRouter()
    const params = useParams()
    const classId = params.id as string
    const { user, loading } = useAuth()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [classInfo, setClassInfo] = useState<Class | null>(null)
    const [members, setMembers] = useState<ClassMemberWithUser[]>([])
    const [isDataLoading, setIsDataLoading] = useState(true)
    const [showImportModal, setShowImportModal] = useState(false)
    const [parsedStudents, setParsedStudents] = useState<StudentData[]>([])
    const [isImporting, setIsImporting] = useState(false)
    const [importError, setImportError] = useState('')
    const [codeCopied, setCodeCopied] = useState(false)
    const [fileName, setFileName] = useState('')

    // Admin State
    const [managingMember, setManagingMember] = useState<ClassMemberWithUser | null>(null)
    const [newPassword, setNewPassword] = useState('')
    const [isAdminLoading, setIsAdminLoading] = useState(false)

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login?role=teacher')
        }
    }, [user, loading, router])

    useEffect(() => {
        if (user && classId) {
            fetchAllData()
        }
    }, [user, classId])

    const fetchAllData = async () => {
        setIsDataLoading(true)
        try {
            await Promise.all([
                fetchClassInfo(),
                fetchMembers()
            ])
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setIsDataLoading(false)
        }
    }

    const fetchClassInfo = async () => {
        try {
            const { data } = await supabase
                .from('classes')
                .select('*')
                .eq('id', classId)
                .single()

            setClassInfo(data)
        } catch (error) {
            console.error('Error fetching class:', error)
        }
    }

    const fetchMembers = async () => {
        try {
            const { data } = await supabase
                .from('class_members')
                .select(`
                    *,
                    users:user_id (name, email)
                `)
                .eq('class_id', classId)
                .order('student_number', { ascending: true })

            setMembers(data || [])
        } catch (error) {
            console.error('Error fetching members:', error)
        }
    }

    const copyCode = () => {
        if (classInfo?.code) {
            navigator.clipboard.writeText(classInfo.code)
            setCodeCopied(true)
            setTimeout(() => setCodeCopied(false), 2000)
        }
    }

    const downloadTemplate = () => {
        // Create template Excel file
        const ws = XLSX.utils.aoa_to_sheet([
            ['出席番号', '氏名', 'メールアドレス'],
            [1, '山田 太郎', 'yamada@example.com'],
            [2, '鈴木 花子', 'suzuki@example.com'],
            [3, '佐藤 一郎', 'sato@example.com'],
        ])

        // Set column widths
        ws['!cols'] = [
            { wch: 10 },
            { wch: 20 },
            { wch: 30 }
        ]

        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, '生徒名簿')
        XLSX.writeFile(wb, 'クラス名簿テンプレート.xlsx')
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setFileName(file.name)
        setImportError('')
        setParsedStudents([])

        const reader = new FileReader()
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target?.result as ArrayBuffer)
                const workbook = XLSX.read(data, { type: 'array' })
                const sheetName = workbook.SheetNames[0]
                const worksheet = workbook.Sheets[sheetName]
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

                // Skip header row and parse
                const students: StudentData[] = []
                for (let i = 1; i < jsonData.length; i++) {
                    const row = jsonData[i]
                    if (row && row.length >= 3) {
                        const number = parseInt(String(row[0])) || i
                        const name = String(row[1] || '').trim()
                        const email = String(row[2] || '').trim()

                        if (name && email && email.includes('@')) {
                            students.push({ number, name, email })
                        }
                    }
                }

                if (students.length === 0) {
                    setImportError('有効なデータが見つかりませんでした。形式を確認してください。')
                } else {
                    setParsedStudents(students)
                }
            } catch (error) {
                console.error('Error parsing file:', error)
                setImportError('ファイルの読み込みに失敗しました。Excel形式(.xlsx)かCSV形式(.csv)を使用してください。')
            }
        }
        reader.readAsArrayBuffer(file)
    }

    const handleImport = async () => {
        if (parsedStudents.length === 0) return

        setIsImporting(true)
        setImportError('')

        try {
            const response = await fetch('/api/import-students', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    students: parsedStudents,
                    classId
                })
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'インポートに失敗しました')
            }

            setIsImporting(false)

            if (result.successCount > 0) {
                setShowImportModal(false)
                setParsedStudents([])
                setFileName('')
                fetchMembers()
                alert(`${result.successCount}名の生徒を登録しました${result.errorCount > 0 ? `（${result.errorCount}名失敗）` : ''}\n\nデフォルトパスワード: student123`)
            } else {
                setImportError(`登録に失敗しました。${result.errors?.[0] || ''}`)
            }
        } catch (e: any) {
            setIsImporting(false)
            setImportError(e.message || '登録に失敗しました')
        }
    }

    // Admin Actions
    const handleResetPassword = async () => {
        if (!managingMember || !newPassword.trim()) return
        if (!confirm(`${(managingMember.users as any)?.name}さんのパスワードを変更しますか？`)) return

        setIsAdminLoading(true)
        try {
            const res = await fetch('/api/teacher/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'resetPassword',
                    studentId: managingMember.user_id,
                    newPassword: newPassword.trim()
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            alert('パスワードを変更しました')
            setNewPassword('')
        } catch (error: any) {
            console.error('Password reset failed:', error)
            alert(`エラー: ${error.message}`)
        } finally {
            setIsAdminLoading(false)
        }
    }

    const handleRemoveStudent = async () => {
        if (!managingMember) return
        if (!confirm(`${(managingMember.users as any)?.name}さんをクラスから削除しますか？\n注意: 生徒はクラス一覧から消えますが、過去の作品データ自体はサーバーに残ります。`)) return

        setIsAdminLoading(true)
        try {
            const res = await fetch('/api/teacher/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'removeStudent',
                    studentId: managingMember.user_id,
                    classId: managingMember.class_id || classId // fallback to param
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            alert('生徒をクラスから削除しました')
            // Update local state
            setMembers(prev => prev.filter(m => m.id !== managingMember.id))
            setManagingMember(null)
        } catch (error: any) {
            console.error('Student removal failed:', error)
            alert(`エラー: ${error.message}`)
        } finally {
            setIsAdminLoading(false)
        }
    }

    if (loading || isDataLoading) {
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
                <div className="flex-1">
                    <p className="page-subtitle">CLASS MANAGEMENT</p>
                    <h1 className="page-title">{classInfo?.name || 'Loading...'}</h1>
                </div>
            </div>

            <div className="max-w-2xl mx-auto">
                {/* Class Code */}
                <div className="card-soft-sm p-4 mb-6 flex items-center justify-between">
                    <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">クラスコード</p>
                        <p className="text-2xl font-mono font-bold text-slate-900">{classInfo?.code}</p>
                    </div>
                    <button
                        onClick={copyCode}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
                    >
                        {codeCopied ? (
                            <>
                                <Check className="w-5 h-5 text-green-600" />
                                <span className="text-green-600">コピー済み</span>
                            </>
                        ) : (
                            <>
                                <Copy className="w-5 h-5 text-slate-600" />
                                <span className="text-slate-600">コピー</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mb-6">
                    <button
                        onClick={() => setShowImportModal(true)}
                        className="btn-primary flex items-center gap-2"
                    >
                        <FileSpreadsheet className="w-5 h-5" />
                        Excel/CSV登録
                    </button>
                </div>

                {/* Members List */}
                <div className="card-soft-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-slate-500" />
                            <h2 className="font-bold text-slate-900">生徒一覧</h2>
                        </div>
                        <span className="text-sm text-slate-500">{members.length}名</span>
                    </div>

                    {members.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            まだ生徒が登録されていません
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {members.map(member => (
                                <div key={member.id} className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-[#5b5fff] flex items-center justify-center text-white font-bold">
                                            {member.student_number}
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900">
                                                {(member.users as any)?.name || 'Unknown'}
                                            </p>
                                            <p className="text-sm text-slate-500">
                                                {(member.users as any)?.email}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setManagingMember(member)}
                                        className="p-2 text-slate-400 hover:text-[#5b5fff] hover:bg-slate-100 rounded-full transition"
                                        title="設定"
                                    >
                                        <Settings className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Admin Modal */}
            {managingMember && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] p-4">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">生徒管理</h3>
                                <p className="text-sm text-slate-500">{(managingMember.users as any)?.name} さん</p>
                            </div>
                            <button
                                onClick={() => setManagingMember(null)}
                                className="p-2 rounded-full hover:bg-slate-100"
                            >
                                <X className="w-6 h-6 text-slate-500" />
                            </button>
                        </div>

                        {/* Password Reset */}
                        <div className="mb-6 p-4 bg-slate-50 rounded-xl">
                            <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-3">
                                <Key className="w-5 h-5 text-slate-600" />
                                パスワードリセット
                            </h4>
                            <p className="text-xs text-slate-500 mb-3">
                                新しいパスワードを設定して、生徒に伝えてください。
                            </p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="新しいパスワード"
                                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                />
                                <button
                                    onClick={handleResetPassword}
                                    disabled={isAdminLoading || !newPassword}
                                    className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
                                >
                                    変更
                                </button>
                            </div>
                        </div>

                        {/* Remove Student */}
                        <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                            <h4 className="font-bold text-red-700 flex items-center gap-2 mb-2">
                                <UserMinus className="w-5 h-5" />
                                クラスから削除
                            </h4>
                            <p className="text-xs text-red-600 mb-4">
                                この生徒をクラスから削除します。
                                <br />
                                <strong>【重要】クラス一覧から表示されなくなりますが、作品データは「退会済み生徒」としてサーバーに残ります（現時点の仕様）。</strong>
                            </p>
                            <button
                                onClick={handleRemoveStudent}
                                disabled={isAdminLoading}
                                className="w-full py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <AlertTriangle className="w-4 h-4" />
                                強制退会実行
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Excel Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-lg max-h-[90vh] overflow-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-slate-900">生徒一括登録</h2>
                            <button
                                onClick={() => {
                                    setShowImportModal(false)
                                    setParsedStudents([])
                                    setFileName('')
                                    setImportError('')
                                }}
                                className="p-2 rounded-full hover:bg-slate-100"
                            >
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        {/* Template Download */}
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                            <p className="text-sm text-blue-800 mb-3">
                                <strong>手順1:</strong> テンプレートをダウンロードして名簿を作成
                            </p>
                            <button
                                onClick={downloadTemplate}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm"
                            >
                                <Download className="w-4 h-4" />
                                テンプレートをダウンロード
                            </button>
                        </div>

                        {/* File Upload */}
                        <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-6 mb-4 text-center">
                            <p className="text-sm text-slate-600 mb-3">
                                <strong>手順2:</strong> 作成した名簿ファイルをアップロード
                            </p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2 px-6 py-3 bg-[#5b5fff] text-white rounded-xl hover:bg-[#4a4eee] transition mx-auto"
                            >
                                <Upload className="w-5 h-5" />
                                ファイルを選択
                            </button>
                            {fileName && (
                                <p className="mt-3 text-sm text-slate-600">
                                    選択中: <strong>{fileName}</strong>
                                </p>
                            )}
                        </div>

                        {/* Preview */}
                        {parsedStudents.length > 0 && (
                            <div className="mb-4">
                                <p className="text-sm font-medium text-slate-700 mb-2">
                                    プレビュー（{parsedStudents.length}名）
                                </p>
                                <div className="bg-slate-50 rounded-xl max-h-48 overflow-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-100 sticky top-0">
                                            <tr>
                                                <th className="px-3 py-2 text-left">No.</th>
                                                <th className="px-3 py-2 text-left">氏名</th>
                                                <th className="px-3 py-2 text-left">メール</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {parsedStudents.map((s, i) => (
                                                <tr key={i} className="border-t border-slate-200">
                                                    <td className="px-3 py-2">{s.number}</td>
                                                    <td className="px-3 py-2">{s.name}</td>
                                                    <td className="px-3 py-2 text-slate-500">{s.email}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {importError && (
                            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm mb-4">
                                {importError}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowImportModal(false)
                                    setParsedStudents([])
                                    setFileName('')
                                    setImportError('')
                                }}
                                className="btn-secondary flex-1"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={isImporting || parsedStudents.length === 0}
                                className="btn-primary flex-1"
                            >
                                {isImporting ? '登録中...' : `${parsedStudents.length}名を登録`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
