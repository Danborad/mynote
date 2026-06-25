import { useRef, useState, useEffect, useCallback } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext' // Added useToast import
import { filesApi, notesApi } from '../api'
import CropModal from './CropModal' // Added CropModal import

export default function Sidebar({ isOpen, onClose, noteCount, favoritesCount, trashCount, user, onLogout, currentView, onSwitchView, folders, isAdminOnly = false }) {
    const { isDark, themeMode, setTheme } = useTheme()
    const { uploadAvatar } = useAuth() // Moved uploadAvatar here
    const { showToast } = useToast() // Added showToast
    const [storageStats, setStorageStats] = useState({ used: 0, limit: 1024 * 1024 * 1024, percentage: 0 })
    const [activityByDate, setActivityByDate] = useState({})
    const [cropModalOpen, setCropModalOpen] = useState(false) // Added state for CropModal
    const [avatarToCrop, setAvatarToCrop] = useState(null) // Added state for avatar to crop

    const fetchStats = useCallback(async () => {
        try {
            const [stats, allNotes] = await Promise.all([
                filesApi.getStats(),
                notesApi.getAll(),
            ])
            setStorageStats(stats)

            const dayCount = 84
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const start = new Date(today)
            start.setDate(today.getDate() - (dayCount - 1))

            const perDay = new Map()
            ;(allNotes || []).forEach((note) => {
                const source = note?.updatedAt || note?.createdAt
                if (!source) return
                const d = new Date(source)
                if (Number.isNaN(d.getTime())) return
                d.setHours(0, 0, 0, 0)
                if (d < start || d > today) return
                const key = d.toISOString().slice(0, 10)
                perDay.set(key, (perDay.get(key) || 0) + 1)
            })

            const nextActivityMap = {}
            Array.from({ length: dayCount }, (_, index) => {
                const d = new Date(start)
                d.setDate(start.getDate() + index)
                const key = d.toISOString().slice(0, 10)
                nextActivityMap[key] = perDay.get(key) || 0
                return null
            })

            setActivityByDate(nextActivityMap)
        } catch (error) {
            console.error('获取存储统计失败:', error)
        }
    }, [])

    useEffect(() => {
        fetchStats()
    }, [fetchStats, noteCount])

    useEffect(() => {
        if (isOpen) {
            fetchStats()
        }
    }, [isOpen, fetchStats])

    useEffect(() => {
        const handleStorageChanged = () => fetchStats()
        const handleNotesChanged = () => fetchStats()
        window.addEventListener('mynote:storage-changed', handleStorageChanged)
        window.addEventListener('mynote:notes-changed', handleNotesChanged)
        return () => {
            window.removeEventListener('mynote:storage-changed', handleStorageChanged)
            window.removeEventListener('mynote:notes-changed', handleNotesChanged)
        }
    }, [fetchStats])

    const heatRows = 7
    const heatCols = 12
    const heatCellCount = heatRows * heatCols
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const currentWeekStart = new Date(today)
    currentWeekStart.setDate(today.getDate() - today.getDay())
    const firstWeekStart = new Date(currentWeekStart)
    firstWeekStart.setDate(currentWeekStart.getDate() - (heatCols - 1) * 7)

    const heatCells = []
    for (let col = 0; col < heatCols; col++) {
        for (let row = 0; row < heatRows; row++) {
            const d = new Date(firstWeekStart)
            d.setDate(firstWeekStart.getDate() + col * 7 + row)
            d.setHours(0, 0, 0, 0)
            const key = d.toISOString().slice(0, 10)
            const isFuture = d > today
            heatCells.push({
                col,
                row,
                date: d,
                key,
                count: isFuture ? null : Number(activityByDate[key] || 0),
            })
        }
    }

    const nonZero = heatCells.map(c => c.count || 0).filter(v => v > 0).sort((a, b) => a - b)
    const q = (p) => nonZero.length ? nonZero[Math.min(nonZero.length - 1, Math.floor((nonZero.length - 1) * p))] : 0
    const t1 = q(0.33)
    const t2 = q(0.66)
    const t3 = q(0.9)

    const heatPalette = isDark
        ? ['#1f2632', '#1f3a30', '#225f47', '#2f8a63', '#55c58b']
        : ['#eef0f2', '#d8eee2', '#b8e4cc', '#8fd8b1', '#61c58f']

    const levelOf = (v) => {
        if (v === null) return 0
        if (v <= 0) return 0
        if (v <= t1) return 1
        if (v <= t2) return 2
        if (v <= t3) return 3
        return 4
    }

    const heatColumns = Array.from({ length: heatCols }, (_, colIdx) =>
        Array.from({ length: heatRows }, (_, rowIdx) => {
            const cell = heatCells.find(c => c.col === colIdx && c.row === rowIdx)
            return {
                ...cell,
                level: levelOf(cell?.count ?? null),
            }
        })
    )

    const monthLabels = Array.from({ length: 3 }, (_, i) => {
        const d = new Date()
        d.setMonth(d.getMonth() - (2 - i))
        return `${d.getMonth() + 1}月`
    })

    const activeNavId = isAdminOnly ? (currentView === 'settings' ? 'settings' : 'admin') : currentView

    const navItems = isAdminOnly ? [
        { id: 'admin', icon: 'admin_panel_settings', label: '用户管理', count: null },
        { id: 'settings', icon: 'settings', label: '全局设置', count: null },
    ] : [
        { id: 'all', icon: 'description', label: '全部笔记', count: noteCount },
        { id: 'favorites', icon: 'favorite', label: '收藏夹', count: favoritesCount || 0 },
        { id: 'trash', icon: 'delete', label: '废纸篓', count: trashCount || 0 },
        { id: 'shares', icon: 'link', label: '分享链接', count: null },
        ...(user?.isAdmin ? [{ id: 'admin', icon: 'admin_panel_settings', label: '管理员后台', count: null }] : []),
    ]

    const fileInputRef = useRef(null)
    // const { uploadAvatar } = useAuth() // Moved this line up

    const handleAvatarClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onload = () => {
                setAvatarToCrop(reader.result)
                setCropModalOpen(true)
            }
            reader.readAsDataURL(file)
        }
        e.target.value = null // Clear the input so the same file can be selected again
    }

    const handleCropComplete = async (croppedBlob) => {
        try {
            const file = new File([croppedBlob], "avatar.jpg", { type: "image/jpeg" })
            await uploadAvatar(file)
            setCropModalOpen(false)
            showToast('头像上传成功', 'success') // Replaced alert with showToast
        } catch (error) {
            showToast('上传头像失败: ' + error.message, 'error') // Replaced alert with showToast
        }
    }

    return (
        <>
            {/* 移动端遮罩 */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={onClose}
                />
            )}

            {/* 侧边栏 */}
            <aside className={`
                fixed md:relative inset-y-0 left-0 z-50
                w-[84vw] max-w-[320px] md:w-[220px] lg:w-[232px]
                bg-[#f7f8fa] dark:bg-[#141b26]
                border-r border-[#dbe3ee] dark:border-[#2e3847]
                flex flex-col shrink-0 overflow-y-auto
                transform transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                {/* 用户信息 */}
                <div className="p-5 md:p-6">
                    <div className="flex items-center space-x-2.5 mb-8">
                        <div className="relative group">
                            <div className="w-11 h-11 rounded-full overflow-hidden border border-white/70 dark:border-white/10 shadow-[0_8px_18px_rgba(15,23,42,0.10)]">
                                {user?.avatar ? (
                                    <img src={user.avatar} alt="User Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-primary flex items-center justify-center text-white font-bold text-xl">
                                        {user?.username?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                )}
                            </div>
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            className="hidden"
                        />

                        <div>
                            <h2 className="font-bold text-[15px] leading-tight dark:text-text-main">{user?.username || '用户'}</h2>
                        </div>
                    </div>

                    {/* 导航菜单 */}
                    <nav className="space-y-2">
                        {navItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => { onSwitchView(item.id); onClose(); }}
                                className={`w-full flex items-center px-3.5 py-2.5 rounded-[18px] font-medium transition-all
                                    ${activeNavId === item.id
                                        ? 'bg-[#ffffff] dark:bg-[#1a2b3f] text-[#1f2937] dark:text-[#8cc7ff] shadow-[0_10px_24px_rgba(15,23,42,0.06)]'
                                        : 'text-[#505c6d] dark:text-[#a8b4c2] hover:bg-white/78 dark:hover:bg-[#182432]'
                                    }
                                `}
                            >
                                <span className="material-icons-outlined text-[20px] mr-2.5">{item.icon}</span>
                                <span className="flex-1 text-left text-[15px]">{item.label}</span>
                                {item.count !== null && (
                                    <span className={`text-[11px] py-0.5 px-2 rounded-full
                                        ${activeNavId === item.id
                                            ? 'bg-[#edf2f8] text-[#5f6b7d]'
                                            : 'bg-[#edf1f6] dark:bg-white/10 text-[#748091] dark:text-text-tertiary'
                                        }
                                    `}>
                                        {item.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* 底部区域 */}
                <div className="px-6 mt-auto mb-6 pb-[max(12px,env(safe-area-inset-bottom))]">
                    {/* 存储 Widget */}
                    {!isAdminOnly && (
                        <div className="bg-white dark:bg-[#111925] rounded-[24px] p-3.5 mb-6 border border-[#e9edf2] dark:border-[#283445] shadow-[0_12px_24px_rgba(15,23,42,0.05)] dark:shadow-[0_18px_36px_rgba(2,6,14,0.28)]">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-[13px] font-semibold text-gray-900 dark:text-text-main">存储空间</h3>
                                <span className="material-icons-outlined text-gray-400 dark:text-text-muted text-[16px]">bar_chart</span>
                            </div>
                            <div className="flex justify-between text-[11px] mb-1">
                                <span className="text-gray-500 dark:text-text-muted">总笔记数</span>
                                <span className="font-bold dark:text-text-main">{noteCount}</span>
                            </div>
                            <div className="flex justify-between text-[11px] mb-3">
                                <span className="text-gray-500 dark:text-text-muted">已用空间</span>
                                <span className="font-bold dark:text-text-main">
                                    {(storageStats.used / 1024 / 1024).toFixed(2)} MB
                                </span>
                            </div>
                            <div>
                                <div className="rounded-[18px] bg-[#fbfcfe] dark:bg-[#101925] p-2.5 border border-[#eef2f6] dark:border-[#263140]">
                                    <div className="w-full flex items-start justify-between">
                                        {heatColumns.map((column, colIdx) => (
                                            <div key={colIdx} className="flex flex-col gap-1">
                                                {column.map((level, rowIdx) => {
                                                    const dateText = level?.date
                                                        ? level.date.toLocaleDateString('zh-CN')
                                                        : ''
                                                    const tip = level?.count === null
                                                        ? `${dateText}（未来）`
                                                        : `${dateText} · ${level.count} 条记录`
                                                    return (
                                                        <div
                                                            key={`${colIdx}-${rowIdx}`}
                                                            className="rounded-[2px] w-2.5 h-2.5 transition-colors"
                                                            style={{ backgroundColor: heatPalette[level.level] }}
                                                            title={tip}
                                                        />
                                                    )
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-2 px-0.5 w-full flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500">
                                        {monthLabels.map((m) => <span key={m}>{m}</span>)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 设置和主题 */}
                    <div className="bg-white dark:bg-[#111925] p-3.5 rounded-[24px] border border-[#e9edf2] dark:border-[#283445] shadow-[0_12px_24px_rgba(15,23,42,0.05)] dark:shadow-[0_18px_36px_rgba(2,6,14,0.28)]">
                        {!isAdminOnly && (
                            <div className="flex justify-between items-center mb-3">
                                <button
                                    onClick={() => { onSwitchView('settings'); onClose(); }}
                                    className={`flex items-center text-[15px] font-medium transition-colors ${currentView === 'settings'
                                        ? 'text-primary'
                                        : 'text-[#5f6b7d] dark:text-text-muted hover:text-primary'
                                        }`}
                                >
                                    <span className="material-icons-outlined text-[20px] mr-2">settings</span>
                                    设置
                                </button>
                            </div>
                        )}

                        <div className="flex gap-1 bg-[#f0f2f5] dark:bg-[#101925] rounded-2xl p-1">
                            <button
                                onClick={() => setTheme('light')}
                                className={`flex-1 h-9 flex items-center justify-center gap-1 px-2 rounded-xl text-xs font-medium transition-all ${themeMode === 'light'
                                    ? 'bg-white dark:bg-[#1f3043] shadow-[0_6px_16px_rgba(15,23,42,0.08)] text-gray-900 dark:text-white'
                                    : 'text-[#6b7483] dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                <span className="material-icons-outlined text-sm">light_mode</span>
                            </button>
                            <button
                                onClick={() => setTheme('dark')}
                                className={`flex-1 h-9 flex items-center justify-center gap-1 px-2 rounded-xl text-xs font-medium transition-all ${themeMode === 'dark'
                                    ? 'bg-white dark:bg-[#1f3043] shadow-[0_6px_16px_rgba(15,23,42,0.08)] text-gray-900 dark:text-white'
                                    : 'text-[#6b7483] dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                <span className="material-icons-outlined text-sm">dark_mode</span>
                            </button>
                            <button
                                onClick={() => setTheme('system')}
                                className={`flex-1 h-9 flex items-center justify-center gap-1 px-2 rounded-xl text-xs font-medium transition-all ${themeMode === 'system'
                                    ? 'bg-white dark:bg-[#1f3043] shadow-[0_6px_16px_rgba(15,23,42,0.08)] text-gray-900 dark:text-white'
                                    : 'text-[#6b7483] dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                <span className="material-icons-outlined text-sm">devices</span>
                            </button>
                        </div>
                    </div>

                    {/* 退出登录/同步 */}
                    <button
                        onClick={onLogout}
                        className="w-full mt-5 flex items-center justify-center gap-2 px-3 py-2 text-[#b76e64] hover:bg-red-50 dark:hover:bg-red-900/10 rounded-2xl transition-all text-sm font-medium"
                    >
                        <span className="material-icons-outlined text-lg">logout</span>
                        退出登录
                    </button>
                </div>
            </aside>
        </>
    )
}
