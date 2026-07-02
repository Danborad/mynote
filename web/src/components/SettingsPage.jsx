import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { notesApi, filesApi, isNativeApp } from '../api'
import CropModal from './CropModal'
import { useNotes } from '../contexts/NotesContext'
import { useToast } from '../contexts/ToastContext' // Added useToast import

const APP_VERSION = '1.0.6'
const GITHUB_URL = 'https://github.com/Danborad/mynote'

export default function SettingsPage({ isOverlayDrawer = false, onClose }) {
    const { user, uploadAvatar, updateSettings, changePassword, login, register, logout, getCaptcha, serverUrl, saveServerAddress, isCloudSession, isRemoteConfigured } = useAuth()
    const { isDark } = useTheme()
    const { createNote, loadNotes, loadFolders, setSelectedNote } = useNotes()
    const { showToast } = useToast() // Extracted showToast
    const nativeApp = isNativeApp()
    const importInputRef = useRef(null)
    const [importMsg, setImportMsg] = useState('')
    const [importing, setImporting] = useState(false)
    const [retentionDays, setRetentionDays] = useState(user?.trashRetentionDays || 30)
    const [shareRetentionDays, setShareRetentionDays] = useState(user?.shareRetentionDays || 30)
    const [usernameInput, setUsernameInput] = useState(user?.username || '')
    const [retentionModalOpen, setRetentionModalOpen] = useState(false)
    const [retentionDraft, setRetentionDraft] = useState(user?.trashRetentionDays || 30)
    const [shareRetentionModalOpen, setShareRetentionModalOpen] = useState(false)
    const [shareRetentionDraft, setShareRetentionDraft] = useState(user?.shareRetentionDays || 30)
    const [usernameModalOpen, setUsernameModalOpen] = useState(false)
    const [passwordModalOpen, setPasswordModalOpen] = useState(false)
    const [usernameSaving, setUsernameSaving] = useState(false)
    const [retentionSaving, setRetentionSaving] = useState(false)

    const actionPrimaryBtnClass = 'h-9 px-3.5 rounded-xl text-[12px] font-semibold bg-primary text-white hover:bg-blue-600 disabled:opacity-60 transition-colors inline-flex items-center justify-center'
    const actionIconBtnClass = 'flex-shrink-0 w-9 h-9 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center justify-center'
    const modalSecondaryBtnClass = 'h-9 px-4 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-600 bg-white/70 dark:bg-gray-700/70 hover:bg-gray-100 dark:hover:bg-gray-700'
    const [stats, setStats] = useState(null)
    const [statsLoading, setStatsLoading] = useState(true)
    const [serverInput, setServerInput] = useState(serverUrl || '')
    const [serverSaving, setServerSaving] = useState(false)
    const [syncMode, setSyncMode] = useState('login')
    const [syncLoading, setSyncLoading] = useState(false)
    const [syncUsername, setSyncUsername] = useState('')
    const [syncPassword, setSyncPassword] = useState('')
    const [syncConfirmPassword, setSyncConfirmPassword] = useState('')
    const [captchaId, setCaptchaId] = useState('')
    const [captchaText, setCaptchaText] = useState('')
    const [captchaImage, setCaptchaImage] = useState('')
    const [updateChecking, setUpdateChecking] = useState(false)

    useEffect(() => {
        setServerInput(serverUrl || '')
    }, [serverUrl])

    useEffect(() => {
        setUsernameInput(user?.username || '')
    }, [user?.username])

    useEffect(() => {
        setRetentionDays(user?.trashRetentionDays || 30)
        setRetentionDraft(user?.trashRetentionDays || 30)
        setShareRetentionDays(user?.shareRetentionDays || 30)
        setShareRetentionDraft(user?.shareRetentionDays || 30)
    }, [user?.trashRetentionDays, user?.shareRetentionDays])

    useEffect(() => {
        const fetchStats = async () => {
            setStatsLoading(true)
            try {
                const [noteStats, fileStats] = await Promise.all([
                    notesApi.getStats(),
                    filesApi.getStats(),
                ])
                setStats({ ...noteStats, storageUsed: fileStats.used, storageLimit: fileStats.limit })
            } catch (e) {
                console.error('获取统计失败', e)
            } finally {
                setStatsLoading(false)
            }
        }
        fetchStats()
    }, [isCloudSession])

    const loadCaptchaForSync = async () => {
        try {
            const data = await getCaptcha()
            setCaptchaId(data.id || '')
            setCaptchaImage(data.image || '')
            setCaptchaText('')
        } catch (error) {
            showToast('加载验证码失败: ' + error.message, 'error')
        }
    }

    useEffect(() => {
        if (!nativeApp) return
        if (syncMode === 'register' && isRemoteConfigured) {
            loadCaptchaForSync()
        }
    }, [syncMode, isRemoteConfigured, nativeApp])

    // Avatar Crop State
    const [cropModalOpen, setCropModalOpen] = useState(false)
    const [selectedImage, setSelectedImage] = useState(null)
    const mobileStatCards = stats ? [
        { label: '全部笔记', value: stats.totalNotes ?? 0, icon: 'description', color: 'text-blue-500' },
        { label: '收藏笔记', value: stats.favoritesCount ?? 0, icon: 'favorite', color: 'text-red-500' },
        { label: '置顶笔记', value: stats.pinnedCount ?? 0, icon: 'push_pin', color: 'text-amber-500' },
        { label: '废纸篓', value: stats.trashCount ?? 0, icon: 'delete', color: 'text-gray-400', accent: true },
        { label: '总字符数', value: stats.totalWordCount?.toLocaleString('zh-CN') ?? '0', icon: 'text_fields', color: 'text-indigo-500' },
        {
            label: '附件存储',
            value: !stats.storageUsed ? '0 KB'
                : stats.storageUsed < 1024 * 1024
                    ? `${(stats.storageUsed / 1024).toFixed(1)} KB`
                    : `${(stats.storageUsed / 1024 / 1024).toFixed(2)} MB`,
            icon: 'folder',
            color: 'text-green-500'
        },
    ] : []
    const storageUsedDisplay = stats?.storageUsed
        ? stats.storageUsed < 1024 * 1024 * 1024
            ? `${(stats.storageUsed / 1024 / 1024).toFixed(1)} MB`
            : `${(stats.storageUsed / 1024 / 1024 / 1024).toFixed(1)} GB`
        : '0 MB'
    const desktopStatCards = stats ? [
        { label: '全部笔记', value: stats.totalNotes ?? 0, icon: 'description' },
        { label: '收藏笔记', value: stats.favoritesCount ?? 0, icon: 'favorite' },
        { label: '置顶笔记', value: stats.pinnedCount ?? 0, icon: 'push_pin' },
        { label: '废纸篓', value: stats.trashCount ?? 0, icon: 'delete' },
        { label: '总字符数', value: stats.totalWordCount?.toLocaleString('zh-CN') ?? '0', icon: 'text_fields' },
        {
            label: '附件存储',
            value: !stats.storageUsed ? '0 KB'
                : stats.storageUsed < 1024 * 1024
                    ? `${(stats.storageUsed / 1024).toFixed(1)} KB`
                    : `${(stats.storageUsed / 1024 / 1024).toFixed(2)} MB`,
            icon: 'folder',
        },
    ] : []
    const desktopSurfaceClass = 'border border-[#dce4ee] dark:border-[#283445] bg-white dark:bg-[#111925] shadow-[0_10px_26px_rgba(27,42,63,0.05)] dark:shadow-[0_18px_36px_rgba(2,6,14,0.28)]'
    const desktopSectionTitleClass = 'mb-2 flex items-center gap-2 text-[14px] font-extrabold text-[#111827] dark:text-white'
    const desktopSettingRowClass = 'min-h-[58px] px-4 grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 border-b border-[#e9eef5] dark:border-[#263241] last:border-b-0'
    const desktopRowIconClass = 'w-7 h-7 rounded-[10px] bg-[#f2f5f9] dark:bg-[#182331] text-[#506074] dark:text-[#9fb0c7] inline-flex items-center justify-center'
    const desktopSettingActionButtonClass = 'w-[132px] h-10 rounded-[13px] bg-[#1568ff] text-white text-[13px] font-extrabold inline-flex items-center justify-center gap-1.5 shadow-[0_8px_18px_rgba(21,104,255,0.16)] hover:bg-[#0f5de8] disabled:opacity-60 transition-colors'

    const handleAvatarChange = (e) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.addEventListener('load', () => {
                setSelectedImage(reader.result)
                setCropModalOpen(true)
            })
            reader.readAsDataURL(file)
            e.target.value = null // Reset input
        }
    }

    const handleCropComplete = async (croppedBlob) => {
        try {
            // Convert blob to file
            const file = new File([croppedBlob], "avatar.jpg", { type: "image/jpeg" })
            await uploadAvatar(file)
            setCropModalOpen(false)
            showToast('头像上传成功', 'success')
        } catch (error) {
            showToast('上传头像失败: ' + error.message, 'error') // Replaced alert
        }
    }

    const handleSaveRetention = async () => {
        setRetentionSaving(true)
        try {
            await updateSettings({
                trashRetentionDays: parseInt(retentionDraft)
            })
            setRetentionDays(parseInt(retentionDraft))
            setRetentionModalOpen(false)
            showToast('保留时间已更新', 'success')
        } catch (error) {
            showToast('保存失败: ' + error.message, 'error')
        } finally {
            setRetentionSaving(false)
        }
    }

    const handleSaveShareRetention = async () => {
        setRetentionSaving(true)
        try {
            await updateSettings({
                shareRetentionDays: parseInt(shareRetentionDraft)
            })
            setShareRetentionDays(parseInt(shareRetentionDraft))
            setShareRetentionModalOpen(false)
            showToast('分享时限已更新', 'success')
        } catch (error) {
            showToast('保存失败: ' + error.message, 'error')
        } finally {
            setRetentionSaving(false)
        }
    }

    const handleSaveUsername = async () => {
        const trimmedUsername = usernameInput.trim()
        if (!trimmedUsername) {
            showToast('用户名不能为空', 'error')
            return
        }

        setUsernameSaving(true)
        try {
            await updateSettings({ username: trimmedUsername })
            showToast('用户名修改成功', 'success')
            setUsernameModalOpen(false)
        } catch (error) {
            showToast('修改失败: ' + error.message, 'error')
        } finally {
            setUsernameSaving(false)
        }
    }

    const handleSaveServer = async () => {
        setServerSaving(true)
        try {
            await saveServerAddress(serverInput)
            await Promise.all([loadNotes(), loadFolders()])
            showToast(serverInput.trim() ? '服务器地址已保存，请登录云端账号' : '已切换到离线模式', 'success')
        } catch (error) {
            showToast('保存服务器地址失败: ' + error.message, 'error')
        } finally {
            setServerSaving(false)
        }
    }

    const handleSyncAuth = async () => {
        if (!syncUsername.trim() || !syncPassword.trim()) {
            showToast('请输入用户名和密码', 'error')
            return
        }

        if (syncMode === 'register') {
            if (syncPassword !== syncConfirmPassword) {
                showToast('两次输入密码不一致', 'error')
                return
            }
            if (!captchaText.trim()) {
                showToast('请输入验证码', 'error')
                return
            }
        }

        setSyncLoading(true)
        try {
            if (syncMode === 'login') {
                await login(syncUsername.trim(), syncPassword)
                showToast('已登录，同步已开启', 'success')
            } else {
                await register(syncUsername.trim(), syncPassword, captchaId, captchaText.trim())
                showToast('注册并登录成功，同步已开启', 'success')
            }

            setSyncPassword('')
            setSyncConfirmPassword('')
            setCaptchaText('')
            await Promise.all([loadNotes(), loadFolders()])
        } catch (error) {
            showToast((syncMode === 'login' ? '登录失败: ' : '注册失败: ') + error.message, 'error')
            if (syncMode === 'register' && isRemoteConfigured) {
                loadCaptchaForSync()
            }
        } finally {
            setSyncLoading(false)
        }
    }

    const handleStopSync = async () => {
        logout()
        await Promise.all([loadNotes(), loadFolders()])
        showToast('已退出云端账号，继续离线使用', 'success')
    }

    const handleCheckUpdate = async () => {
        setUpdateChecking(true)
        try {
            const response = await fetch('/api/version/latest')
            if (!response.ok) {
                throw new Error(`服务返回 ${response.status}`)
            }

            const data = await response.json()
            if (!data.ok) {
                showToast(data.message || '暂时无法检查更新，请稍后再试', 'warning')
                return
            }

            if (data.hasUpdate && data.latest) {
                showToast(`发现新版本 ${data.latest}，请前往 GitHub 下载`, 'success')
            } else {
                showToast(`当前已是最新版本 v${APP_VERSION}`, 'success')
            }
        } catch (error) {
            showToast(`暂时无法检查更新: ${error.message}`, 'warning')
        } finally {
            setUpdateChecking(false)
        }
    }



    // 导入笔记
    const handleImportNote = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        e.target.value = null
        setImporting(true)
        setImportMsg('')
        try {
            const isMarkdown = file.name.endsWith('.md') || file.name.endsWith('.markdown')
            const text = await file.text()
            let htmlContent = ''
            if (isMarkdown) {
                const escaped = text
                    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
                    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
                    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
                    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.+?)\*/g, '<em>$1</em>')
                    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
                    .replace(/`([^`]+)`/g, '<code>$1</code>')
                    .replace(/^- (.+)$/gm, '<li>$1</li>')
                    .split('\n\n').join('</p><p>')
                    .split('\n').join('<br/>')
                htmlContent = `<p>${escaped}</p>`
            } else {
                const escaped = text.split('\n\n').join('</p><p>').split('\n').join('<br/>')
                htmlContent = `<p>${escaped}</p>`
            }
            const firstLine = text.split('\n')[0]
            const title = firstLine.replace(/^#+\s*/, '').trim().slice(0, 50) || file.name
            await createNote({ title, content: htmlContent })
            setSelectedNote(null)
            setImportMsg(`已导入「${title}」`)
            setTimeout(() => setImportMsg(''), 3000)
        } catch (err) {
            setImportMsg('导入失败: ' + err.message)
        } finally {
            setImporting(false)
        }
    }

    return (
        <div
            data-settings-page={isOverlayDrawer ? undefined : 'inline'}
            className={`editor-stage flex-1 ${isOverlayDrawer ? 'overlay-stage-reset h-full min-h-0 overflow-hidden bg-transparent md:p-0' : 'h-full min-h-0 flex flex-col overflow-hidden bg-[#f6f7f9] dark:bg-[#0f1722] px-3 pt-2 pb-4 md:pl-[72px] md:pr-[52px] md:pt-[38px] md:pb-11'}`}
        >
            <div className={`${isOverlayDrawer ? 'h-full min-h-0 overflow-y-auto no-scrollbar px-1 md:px-0 pt-2 md:pt-1 pr-1 md:pr-1.5' : 'mr-auto h-full w-full max-w-[720px] md:max-w-[1060px] min-h-0 overflow-y-auto no-scrollbar'}`}>
                <div className="md:hidden mb-4 rounded-[24px] border border-[#e8edf4] dark:border-[#243244] bg-white px-4 py-3 shadow-[0_12px_28px_rgba(15,23,42,0.06)] dark:bg-[#111925] dark:shadow-[0_18px_36px_rgba(2,6,14,0.28)]">
                    <div className="text-[18px] font-extrabold tracking-[-0.03em] text-[#2563eb] dark:text-[#7fb5ff]">设置中心</div>
                    <div className="text-[11px] text-[#98a2b3] dark:text-[#7f8da3]">移动端设置总览</div>
                    <div className="mt-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-4 min-w-0">
                            <div className="relative group flex-shrink-0">
                                <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center text-white text-lg font-bold overflow-hidden">
                                    {user?.avatar ? (
                                        <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <span>{user?.username?.charAt(0).toUpperCase()}</span>
                                    )}
                                </div>
                                <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-lg">
                                    <span className="material-icons-outlined text-white text-sm">camera_alt</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                                </label>
                            </div>
                            <div className="min-w-0">
                                <div className="text-[11px] font-semibold text-[#111827] dark:text-white flex items-center gap-1.5">
                                    <span className="material-icons-outlined text-[14px]">account_circle</span>
                                    账号信息
                                </div>
                                <div className="mt-1 text-[18px] font-medium text-gray-900 dark:text-white truncate">{user?.username || '-'}</div>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setUsernameModalOpen(true)}
                            className={actionIconBtnClass}
                            aria-label="修改用户名"
                        >
                            <span className="material-icons-outlined text-[16px] leading-none">edit</span>
                        </button>
                    </div>
                </div>
                {!isOverlayDrawer && (
                    <div data-settings-content="desktop-v2" className="hidden md:block w-full max-w-[1060px]">
                        <header className="mb-[22px] flex h-[46px] items-center gap-3">
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#dce4ee] bg-white text-[#536174] dark:border-[#283445] dark:bg-[#111925] dark:text-[#9fb0c7]">
                                <span className="material-icons-outlined text-[18px] leading-none">settings</span>
                            </span>
                            <h1 className="text-[22px] font-extrabold leading-none text-[#111827] dark:text-white">设置中心</h1>
                        </header>

                        <div className="grid grid-cols-[minmax(0,1fr)_316px] items-start gap-[18px]">
                            <div className="grid gap-3.5">
                                <section className={`${desktopSurfaceClass} rounded-[18px] p-4`}>
                                    <div className="grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3.5">
                                        <div className="relative group h-[52px] w-[52px] flex-shrink-0 overflow-hidden rounded-[14px] bg-blue-500 text-white">
                                            {user?.avatar ? (
                                                <img src={user.avatar} alt="Avatar" className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center text-lg font-bold">
                                                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                                                </div>
                                            )}
                                            <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                                                <span className="material-icons-outlined text-sm text-white">camera_alt</span>
                                                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                                            </label>
                                        </div>
                                        <div className="min-w-0">
                                            <div className="mb-1 text-[12px] font-bold text-[#9aa6b5] dark:text-[#7f8da3]">账号信息</div>
                                            <div className="truncate text-[20px] font-extrabold text-[#111827] dark:text-white">{user?.username || '-'}</div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setUsernameModalOpen(true)}
                                            className="inline-flex h-10 w-10 items-center justify-center rounded-[14px] border border-[#cfe0f7] bg-[#eaf2ff] text-[#1568ff] transition-colors hover:bg-[#dfeeff] dark:border-[#234061] dark:bg-[#17283d] dark:text-[#8cc7ff]"
                                            aria-label="修改用户名"
                                        >
                                            <span className="material-icons-outlined text-[16px] leading-none">edit</span>
                                        </button>
                                    </div>
                                </section>

                                {nativeApp && (
                                    <section>
                                        <h2 className={desktopSectionTitleClass}>
                                            <span className="material-icons-outlined text-base">cloud_sync</span>
                                            云端同步
                                        </h2>
                                        <div className={`${desktopSurfaceClass} rounded-[18px] p-4`}>
                                            <div className="grid grid-cols-[minmax(0,1fr)_92px] items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={serverInput}
                                                    onChange={(e) => setServerInput(e.target.value)}
                                                    placeholder="例如: http://192.168.1.20:3665"
                                                    className="h-10 rounded-xl border border-[#dce4ee] bg-[#f8fafc] px-3 text-sm outline-none focus:border-[#1568ff] dark:border-[#263241] dark:bg-[#0f1722]"
                                                />
                                                <button
                                                    onClick={handleSaveServer}
                                                    disabled={serverSaving}
                                                    className="h-10 rounded-xl bg-[#1568ff] text-sm font-bold text-white hover:bg-[#0f5de8] disabled:opacity-60"
                                                >
                                                    {serverSaving ? '保存中' : '保存'}
                                                </button>
                                            </div>
                                            <p className="mt-2 text-[12px] text-[#6c7788] dark:text-[#7f8da3]">留空则保持离线模式，填写后可登录并同步到云端。</p>
                                        </div>
                                    </section>
                                )}

                                <section>
                                    <h2 className={desktopSectionTitleClass}>
                                        <span className="material-icons-outlined text-base">bar_chart</span>
                                        数据统计
                                    </h2>
                                    <div className={`${desktopSurfaceClass} rounded-[18px] bg-[#f7f9fc] p-2 dark:bg-[#0f1722]`}>
                                        {statsLoading ? (
                                            <div className="grid grid-cols-3 gap-1.5">
                                                {[...Array(6)].map((_, i) => (
                                                    <div key={i} className="min-h-[72px] animate-pulse rounded-[14px] bg-white p-3 dark:bg-[#111925]">
                                                        <div className="mb-3 h-3 w-20 rounded bg-[#e5ebf3] dark:bg-[#263241]" />
                                                        <div className="h-5 w-10 rounded bg-[#e5ebf3] dark:bg-[#263241]" />
                                                    </div>
                                                ))}
                                            </div>
                                        ) : stats ? (
                                            <div className="grid grid-cols-3 gap-1.5">
                                                {desktopStatCards.map((item) => (
                                                    <div key={item.label} className="min-h-[72px] rounded-[14px] bg-white p-3 dark:bg-[#111925]">
                                                        <div className="mb-2 flex items-center gap-1.5 text-[12px] text-[#6c7788] dark:text-[#8ea0b7]">
                                                            <span className="material-icons-outlined text-sm">{item.icon}</span>
                                                            <span>{item.label}</span>
                                                        </div>
                                                        <div className="text-[19px] font-extrabold text-[#111827] dark:text-white">{item.value}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="rounded-[14px] bg-white p-3 text-sm text-[#6c7788] dark:bg-[#111925] dark:text-[#8ea0b7]">暂无数据</p>
                                        )}
                                    </div>
                                </section>

                                <section>
                                    <h2 className={desktopSectionTitleClass}>
                                        <span className="material-icons-outlined text-base">settings</span>
                                        偏好设置
                                    </h2>
                                    <div className={`${desktopSurfaceClass} overflow-hidden rounded-[18px]`}>
                                        <div className={desktopSettingRowClass}>
                                            <span className={desktopRowIconClass}>
                                                <span className="material-icons-outlined text-[16px]">delete</span>
                                            </span>
                                            <div className="min-w-0">
                                                <div className="text-[14px] font-extrabold text-[#111827] dark:text-white">废纸篓清理</div>
                                                <div className="mt-0.5 text-[12px] text-[#6c7788] dark:text-[#8ea0b7]">超过保留时间后自动清理</div>
                                            </div>
                                            <button type="button" onClick={() => { setRetentionDraft(retentionDays); setRetentionModalOpen(true) }} className="inline-flex items-center gap-1 text-[13px] font-extrabold text-[#1568ff]">
                                                <span>{retentionDays === 30 ? '30天' : retentionDays === 90 ? '90天' : `${retentionDays}天`}</span>
                                                <span className="material-icons-outlined text-[15px]">chevron_right</span>
                                            </button>
                                        </div>
                                        <div className={desktopSettingRowClass}>
                                            <span className={desktopRowIconClass}>
                                                <span className="material-icons-outlined text-[16px]">schedule</span>
                                            </span>
                                            <div className="min-w-0">
                                                <div className="text-[14px] font-extrabold text-[#111827] dark:text-white">链接有效期</div>
                                                <div className="mt-0.5 text-[12px] text-[#6c7788] dark:text-[#8ea0b7]">新分享链接默认过期时间</div>
                                            </div>
                                            <button type="button" onClick={() => { setShareRetentionDraft(shareRetentionDays); setShareRetentionModalOpen(true) }} className="inline-flex items-center gap-1 text-[13px] font-extrabold text-[#1568ff]">
                                                <span>{shareRetentionDays === 30 ? '30天' : shareRetentionDays === 90 ? '90天' : `${shareRetentionDays}天`}</span>
                                                <span className="material-icons-outlined text-[15px]">chevron_right</span>
                                            </button>
                                        </div>
                                    </div>
                                </section>

                                <section>
                                    <h2 className={desktopSectionTitleClass}>
                                        <span className="material-icons-outlined text-base">download</span>
                                        导入笔记
                                    </h2>
                                    <div className={`${desktopSurfaceClass} overflow-hidden rounded-[18px]`}>
                                        <div className={desktopSettingRowClass}>
                                            <span className={`${desktopRowIconClass} text-[12px] font-bold`}>md</span>
                                            <div className="min-w-0">
                                                <div className="text-[14px] font-extrabold text-[#111827] dark:text-white">Markdown / Text</div>
                                                <div className="mt-0.5 truncate text-[12px] text-[#6c7788] dark:text-[#8ea0b7]">支持 .md、.markdown、.txt 文件</div>
                                                {importMsg && (
                                                    <div className={`mt-1 text-[12px] ${importMsg.startsWith('导入失败') ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                                                        {importMsg}
                                                    </div>
                                                )}
                                            </div>
                                            <label
                                                data-settings-action="import"
                                                className={`${desktopSettingActionButtonClass} ${importing ? 'cursor-wait bg-[#9aa6b5] hover:bg-[#9aa6b5]' : 'cursor-pointer'}`}
                                            >
                                                {importing ? '导入中...' : '选择文件导入'}
                                                <input
                                                    type="file"
                                                    accept=".md,.markdown,.txt"
                                                    className="hidden"
                                                    onChange={handleImportNote}
                                                    disabled={importing}
                                                />
                                            </label>
                                        </div>
                                    </div>
                                </section>

                                {isCloudSession && (
                                    <section>
                                        <h2 className={desktopSectionTitleClass}>
                                            <span className="material-icons-outlined text-base">lock</span>
                                            安全设置
                                        </h2>
                                        <div className={`${desktopSurfaceClass} overflow-hidden rounded-[18px]`}>
                                            <div className={desktopSettingRowClass}>
                                                <span className={desktopRowIconClass}>
                                                    <span className="material-icons-outlined text-[16px]">fiber_manual_record</span>
                                                </span>
                                                <div className="min-w-0">
                                                    <div className="text-[14px] font-extrabold text-[#111827] dark:text-white">账号密码</div>
                                                    <div className="mt-0.5 text-[12px] text-[#6c7788] dark:text-[#8ea0b7]">建议定期更新密码</div>
                                                </div>
                                                <button
                                                    type="button"
                                                    data-settings-action="password"
                                                    onClick={() => setPasswordModalOpen(true)}
                                                    className={desktopSettingActionButtonClass}
                                                >
                                                    修改密码
                                                </button>
                                            </div>
                                        </div>
                                    </section>
                                )}
                            </div>

                            <aside className={`${desktopSurfaceClass} rounded-[18px] p-4`}>
                                <h2 className={desktopSectionTitleClass}>
                                    <span className="material-icons-outlined text-base">radio_button_checked</span>
                                    账户概览
                                </h2>
                                <div
                                    className="relative mx-auto mb-2 mt-3 h-32 w-32 rounded-full bg-[#dce6f3] dark:bg-[#263241]"
                                >
                                    <div className="absolute left-1/2 top-0 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-[#1568ff]" />
                                    <div className="absolute inset-3.5 flex items-center justify-center rounded-full bg-white text-[14px] font-extrabold text-[#111827] dark:bg-[#111925] dark:text-white">
                                        {storageUsedDisplay}
                                    </div>
                                </div>
                                <div className="mt-4 grid gap-2.5 text-[12px] text-[#6c7788] dark:text-[#8ea0b7]">
                                    <div className="flex justify-between gap-3">
                                        <span>同步状态</span>
                                        <strong className="text-[#667386] dark:text-[#a9b8cc]">{isCloudSession ? '云端同步' : '本地优先'}</strong>
                                    </div>
                                    <div className="flex justify-between gap-3">
                                        <span>分享链接</span>
                                        <strong className="text-[#667386] dark:text-[#a9b8cc]">{shareRetentionDays} 天</strong>
                                    </div>
                                </div>
                                <div className="mt-5 border-t border-[#e9eef5] pt-4 dark:border-[#263241]">
                                    <h2 className={desktopSectionTitleClass}>
                                        <span className="material-icons-outlined text-base">info</span>
                                        关于 MyNote
                                    </h2>
                                <div className="space-y-2.5 text-[12px] text-[#6c7788] dark:text-[#8ea0b7]">
                                    <div className="flex items-center justify-between gap-3 rounded-[13px] bg-[#f7f9fc] px-3 py-2 dark:bg-[#0f1722]">
                                        <span>当前版本</span>
                                        <strong className="text-[#111827] dark:text-white">v{APP_VERSION}</strong>
                                    </div>
                                    <a
                                        href={GITHUB_URL}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center justify-between gap-3 rounded-[13px] bg-[#f7f9fc] px-3 py-2 font-bold text-[#1568ff] hover:bg-[#edf4ff] dark:bg-[#0f1722] dark:text-[#8cc7ff]"
                                    >
                                        <span>GitHub 地址</span>
                                        <span className="material-icons-outlined text-[15px]">open_in_new</span>
                                    </a>
                                    <button
                                        type="button"
                                        onClick={handleCheckUpdate}
                                        disabled={updateChecking}
                                        className="h-10 w-full rounded-[13px] bg-[#1568ff] text-[13px] font-extrabold text-white shadow-[0_8px_18px_rgba(21,104,255,0.16)] hover:bg-[#0f5de8] disabled:opacity-60"
                                    >
                                        {updateChecking ? '检查中...' : '检查更新'}
                                    </button>
                                </div>
                                </div>
                            </aside>
                        </div>
                    </div>
                )}

                <div className="md:hidden">

                {nativeApp && (
                    <section className="mb-4 md:mb-2.5">
                        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 md:mb-1.5 flex items-center gap-2">
                            <span className="material-icons-outlined text-base">cloud_sync</span>
                            云端同步
                        </h2>
                        <div className="surface-card bg-[#ffffff] dark:bg-[#111925] rounded-xl p-3 md:p-2.5 space-y-3 md:space-y-2.5 border border-[#e7edf5] dark:border-[#283445]">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-text-secondary mb-1.5">
                                    服务器地址
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={serverInput}
                                        onChange={(e) => setServerInput(e.target.value)}
                                        placeholder="例如: http://192.168.1.20:3665"
                                        className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:border-primary outline-none text-sm"
                                    />
                                    <button
                                        onClick={handleSaveServer}
                                        disabled={serverSaving}
                                        className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-60"
                                    >
                                        {serverSaving ? '保存中' : '保存'}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-text-secondary mt-2">
                                    留空则保持离线模式，填写后可登录并同步到云端。
                                </p>
                            </div>

                            {isRemoteConfigured && (
                                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 md:pt-3">
                                    {isCloudSession ? (
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">已连接云端账号</p>
                                                <p className="text-xs text-gray-500 dark:text-text-secondary mt-1">当前账号：{user?.username || '未命名用户'}</p>
                                            </div>
                                            <button
                                                onClick={handleStopSync}
                                                className="px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 text-sm"
                                            >
                                                退出同步
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-3 md:space-y-2.5">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setSyncMode('login')}
                                                    className={`px-3 py-1.5 rounded-lg text-sm ${syncMode === 'login' ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                                                >
                                                    登录同步
                                                </button>
                                                <button
                                                    onClick={() => setSyncMode('register')}
                                                    className={`px-3 py-1.5 rounded-lg text-sm ${syncMode === 'register' ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                                                >
                                                    注册并同步
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                <input
                                                    type="text"
                                                    value={syncUsername}
                                                    onChange={(e) => setSyncUsername(e.target.value)}
                                                    placeholder="用户名"
                                                    className="px-3 py-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:border-primary outline-none text-sm"
                                                />
                                                <input
                                                    type="password"
                                                    value={syncPassword}
                                                    onChange={(e) => setSyncPassword(e.target.value)}
                                                    placeholder="密码"
                                                    className="px-3 py-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:border-primary outline-none text-sm"
                                                />
                                                {syncMode === 'register' && (
                                                    <>
                                                        <input
                                                            type="password"
                                                            value={syncConfirmPassword}
                                                            onChange={(e) => setSyncConfirmPassword(e.target.value)}
                                                            placeholder="确认密码"
                                                            className="px-3 py-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:border-primary outline-none text-sm"
                                                        />
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="text"
                                                                value={captchaText}
                                                                onChange={(e) => setCaptchaText(e.target.value)}
                                                                placeholder="验证码"
                                                                className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:border-primary outline-none text-sm"
                                                            />
                                                            {captchaImage ? (
                                                                <button type="button" onClick={loadCaptchaForSync} className="h-9 rounded border border-gray-200 dark:border-gray-600 overflow-hidden">
                                                                    <img src={captchaImage} alt="验证码" className="h-full" />
                                                                </button>
                                                            ) : (
                                                                <button type="button" onClick={loadCaptchaForSync} className="px-2 py-2 text-xs rounded bg-gray-200 dark:bg-gray-700">
                                                                    刷新
                                                                </button>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            <button
                                                onClick={handleSyncAuth}
                                                disabled={syncLoading}
                                                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-60"
                                            >
                                                {syncLoading ? '提交中...' : (syncMode === 'login' ? '登录并同步' : '注册并同步')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {/* 数据统计 */}
                <section className="mb-4 md:mb-2.5">
                    <h2 className="hidden md:flex text-sm font-semibold text-gray-900 dark:text-white mb-1.5 items-center gap-2">
                        <span className="material-icons-outlined text-base">bar_chart</span>
                        数据统计
                    </h2>
                    {statsLoading ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="bg-gray-50 dark:bg-[#111925] rounded-[20px] md:rounded-xl p-2 animate-pulse border border-transparent dark:border-[#283445] min-h-[64px] md:min-h-[58px]">
                                    <div className="h-2.5 w-12 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                                    <div className="h-5 w-8 bg-gray-200 dark:bg-gray-700 rounded" />
                                </div>
                            ))}
                        </div>
                    ) : stats ? (
                        <>
                            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-2">
                                {mobileStatCards.map((item) => (
                                    <div key={item.label} className="md:hidden rounded-[20px] border border-[#e8edf4] dark:border-[#243244] bg-white px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)] dark:bg-[#111925] dark:shadow-[0_16px_32px_rgba(2,6,14,0.24)]">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`material-icons-outlined text-sm ${item.color}`}>{item.icon}</span>
                                            <div className="text-[11px] font-medium text-[#98a2b3] dark:text-[#7f8da3]">{item.label}</div>
                                        </div>
                                        <div className={`mt-2 text-[26px] font-extrabold tracking-[-0.04em] ${item.accent ? 'text-[#dc2626] dark:text-[#fb7185]' : 'text-[#1f2937] dark:text-white'}`}>{item.value}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="hidden md:grid grid-cols-3 gap-2">
                                {[
                                { label: '全部笔记', value: stats.totalNotes, icon: 'description', color: 'text-blue-500' },
                                { label: '收藏笔记', value: stats.favoritesCount, icon: 'favorite', color: 'text-red-500' },
                                { label: '置顶笔记', value: stats.pinnedCount, icon: 'push_pin', color: 'text-amber-500' },
                                { label: '废纸篓', value: stats.trashCount, icon: 'delete', color: 'text-gray-400' },
                                { label: '总字符数', value: stats.totalWordCount?.toLocaleString('zh-CN'), icon: 'text_fields', color: 'text-indigo-500' },
                                {
                                    label: '附件存储',
                                    value: !stats.storageUsed ? '0 KB'
                                        : stats.storageUsed < 1024 * 1024
                                            ? `${(stats.storageUsed / 1024).toFixed(1)} KB`
                                            : `${(stats.storageUsed / 1024 / 1024).toFixed(2)} MB`,
                                    icon: 'folder',
                                    color: 'text-green-500'
                                },
                                ].map(item => (
                                <div key={item.label} className="bg-gray-50 dark:bg-[#111925] rounded-xl p-2 flex flex-col gap-1 border border-transparent dark:border-[#283445] min-h-[64px] md:min-h-[58px]">
                                    <div className="flex items-center gap-1">
                                        <span className={`material-icons-outlined text-sm ${item.color}`}>{item.icon}</span>
                                        <span className="text-[11px] text-gray-500 dark:text-text-secondary leading-tight">{item.label}</span>
                                    </div>
                                    <span className="text-[14px] font-bold text-gray-900 dark:text-white">{item.value ?? 0}</span>
                                </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <p className="text-sm text-gray-400 dark:text-text-muted">暂无数据</p>
                    )}
                </section>

                {/* 偏好设置 */}
                <section className="mb-4 md:mb-2.5">
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 md:mb-1.5 flex items-center gap-2">
                        <span className="material-icons-outlined text-base">settings</span>
                        偏好设置
                    </h2>
                    <div className="surface-card bg-[#ffffff] dark:bg-[#111925] rounded-[24px] md:rounded-xl p-3 md:p-2.5 space-y-2 md:space-y-1.5 border border-[#e7edf5] dark:border-[#283445] shadow-[0_12px_28px_rgba(15,23,42,0.06)] md:shadow-none dark:shadow-[0_18px_36px_rgba(2,6,14,0.28)]">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-text-secondary mb-1.5">
                                废纸篓保留时间
                            </label>
                            <div className="flex items-center justify-between gap-3 min-h-9 md:min-h-8 rounded-[18px] bg-[#fbfcfe] px-3 py-1.5 md:py-1 dark:bg-[#0f1722]">
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-text-secondary min-w-0">
                                    <span className="material-icons-outlined text-[16px] text-[#111827] dark:text-[#9fb0c7]">delete</span>
                                    <span className="truncate">废纸篓清理</span>
                                </div>
                                <button type="button" onClick={() => { setRetentionDraft(retentionDays); setRetentionModalOpen(true) }} className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#2563eb]">
                                    <span>{retentionDays === 30 ? '30天' : retentionDays === 90 ? '90天' : `${retentionDays}天`}</span>
                                    <span className="material-icons-outlined text-[14px]">chevron_right</span>
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-text-secondary mb-1.5">
                                链接分享时限
                            </label>
                            <div className="flex items-center justify-between gap-3 min-h-9 md:min-h-8 rounded-[18px] bg-[#fbfcfe] px-3 py-1.5 md:py-1 dark:bg-[#0f1722]">
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-text-secondary min-w-0">
                                    <span className="material-icons-outlined text-[16px] text-[#111827] dark:text-[#9fb0c7]">schedule</span>
                                    <span className="truncate">链接有效期</span>
                                </div>
                                <button type="button" onClick={() => { setShareRetentionDraft(shareRetentionDays); setShareRetentionModalOpen(true) }} className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#2563eb]">
                                    <span>{shareRetentionDays === 30 ? '30天' : shareRetentionDays === 90 ? '90天' : `${shareRetentionDays}天`}</span>
                                    <span className="material-icons-outlined text-[14px]">chevron_right</span>
                                </button>
                            </div>
                        </div>

                    </div>
                </section>

                {/* 导入笔记 */}
                <section className="mb-4 md:mb-2.5">
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 md:mb-1.5 flex items-center gap-2">
                        <span className="material-icons-outlined text-base">download</span>
                        导入笔记
                    </h2>
                    <div className="bg-white dark:bg-[#111925] rounded-[24px] md:rounded-xl p-3 md:p-2.5 border border-[#e7edf5] dark:border-[#283445] shadow-[0_12px_28px_rgba(15,23,42,0.06)] md:shadow-none dark:shadow-[0_18px_36px_rgba(2,6,14,0.28)]">
                        <p className="text-[13px] text-gray-500 dark:text-text-secondary mb-2 md:mb-1.5">支持导入 <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">.md</code>、<code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">.markdown</code>、<code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">.txt</code> 文件，每次导入一个文件为一篇新笔记。</p>
                        <div className="flex flex-col gap-2 md:gap-1.5">
                            <div className="min-h-[20px] md:min-h-[18px] text-sm">
                                {importMsg && (
                                    <span className={`${importMsg.startsWith('导入失败') ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                                        {importMsg}
                                    </span>
                                )}
                            </div>

                            <label
                                htmlFor="settings-import-input"
                                className={`h-9 w-full rounded-xl text-[12px] font-semibold inline-flex items-center justify-center gap-2 cursor-pointer ${importing
                                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-wait'
                                    : 'bg-primary text-white hover:bg-blue-600'
                                    }`}
                            >
                                <span className="material-icons-outlined text-base">{importing ? 'hourglass_empty' : 'download'}</span>
                                {importing ? '导入中...' : '选择文件导入'}
                            </label>
                            <input
                                id="settings-import-input"
                                ref={importInputRef}
                                type="file"
                                accept=".md,.markdown,.txt"
                                className="hidden"
                                onChange={handleImportNote}
                                disabled={importing}
                            />
                        </div>
                    </div>
                </section>

                {/* 修改密码 */}
                {isCloudSession && (
                    <>
                        <h2 className="text-sm font-bold text-gray-900 dark:text-white mt-4 md:mt-3 mb-2 md:mb-1.5 flex items-center">
                            <span className="material-icons-outlined mr-1.5 text-base">lock</span>
                            安全设置
                        </h2>
                        <div className="bg-white dark:bg-[#111925] rounded-[24px] md:rounded-xl p-3 md:p-2.5 border border-[#e7edf5] dark:border-[#283445] shadow-[0_12px_28px_rgba(15,23,42,0.06)] md:shadow-none dark:shadow-[0_18px_36px_rgba(2,6,14,0.28)]">
                            <p className="text-[13px] text-gray-600 dark:text-text-secondary mb-2 md:mb-1.5">建议定期更新密码，保护账号安全。</p>
                            <button
                                type="button"
                                onClick={() => setPasswordModalOpen(true)}
                                className="h-9 w-full rounded-xl text-[12px] font-semibold bg-primary text-white hover:bg-blue-600 inline-flex items-center justify-center gap-2"
                            >
                                <span className="material-icons-outlined text-[16px]">lock_reset</span>
                                修改密码
                            </button>
                        </div>
                    </>
                )}

                <section className="mb-4 md:mb-2.5">
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 md:mb-1.5 flex items-center gap-2">
                        <span className="material-icons-outlined text-base">info</span>
                        关于 MyNote
                    </h2>
                    <div className="bg-white dark:bg-[#111925] rounded-[24px] md:rounded-xl p-3 md:p-2.5 border border-[#e7edf5] dark:border-[#283445] shadow-[0_12px_28px_rgba(15,23,42,0.06)] md:shadow-none dark:shadow-[0_18px_36px_rgba(2,6,14,0.28)]">
                        <div className="flex items-center justify-between gap-3 min-h-9 rounded-[18px] bg-[#fbfcfe] px-3 py-1.5 dark:bg-[#0f1722]">
                            <span className="text-sm text-gray-600 dark:text-text-secondary">当前版本</span>
                            <strong className="text-sm text-gray-900 dark:text-white">v{APP_VERSION}</strong>
                        </div>
                        <a
                            href={GITHUB_URL}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 flex items-center justify-between gap-3 min-h-9 rounded-[18px] bg-[#fbfcfe] px-3 py-1.5 text-sm font-semibold text-[#2563eb] dark:bg-[#0f1722] dark:text-[#8cc7ff]"
                        >
                            <span>GitHub 地址</span>
                            <span className="material-icons-outlined text-[15px]">open_in_new</span>
                        </a>
                        <button
                            type="button"
                            onClick={handleCheckUpdate}
                            disabled={updateChecking}
                            className="mt-2 h-9 w-full rounded-xl text-[12px] font-semibold bg-primary text-white hover:bg-blue-600 disabled:opacity-60 inline-flex items-center justify-center gap-2"
                        >
                            <span className="material-icons-outlined text-[16px]">system_update</span>
                            {updateChecking ? '检查中...' : '检查更新'}
                        </button>
                    </div>
                </section>

                <div className="md:hidden pt-1 pb-3 text-center text-[10px] text-[#98a2b3] dark:text-[#7f8da3]">
                    V {APP_VERSION} • © 2026 MyNote
                </div>
                </div>

                {/* Crop Modal */}
                <CropModal
                    isOpen={cropModalOpen}
                    imageSrc={selectedImage}
                    onClose={() => setCropModalOpen(false)}
                    onCropComplete={handleCropComplete}
                />

                <UsernameEditModal
                    isOpen={usernameModalOpen}
                    username={usernameInput}
                    onChange={setUsernameInput}
                    onClose={() => {
                        setUsernameInput(user?.username || '')
                        setUsernameModalOpen(false)
                    }}
                    onSubmit={handleSaveUsername}
                    loading={usernameSaving}
                />

                <PasswordChangeModal
                    isOpen={passwordModalOpen}
                    onClose={() => setPasswordModalOpen(false)}
                    changePassword={changePassword}
                    showToast={showToast}
                />

                <RetentionPickerModal
                    isOpen={retentionModalOpen}
                    title="选择废纸篓保留时间"
                    value={retentionDraft}
                    onChange={setRetentionDraft}
                    onClose={() => setRetentionModalOpen(false)}
                    onSubmit={handleSaveRetention}
                    loading={retentionSaving}
                />

                <RetentionPickerModal
                    isOpen={shareRetentionModalOpen}
                    title="选择链接分享时限"
                    value={shareRetentionDraft}
                    onChange={setShareRetentionDraft}
                    onClose={() => setShareRetentionModalOpen(false)}
                    onSubmit={handleSaveShareRetention}
                    loading={retentionSaving}
                />
            </div>
        </div>
    )
}

function RetentionPickerModal({ isOpen, title, value, onChange, onClose, onSubmit, loading }) {
    useEffect(() => {
        if (!isOpen) return
        const onKeyDown = (e) => {
            if (e.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [isOpen, onClose])

    if (!isOpen) return null

    const options = [
        { label: '7天', value: 7 },
        { label: '15天', value: 15 },
        { label: '1个月', value: 30 },
        { label: '3个月', value: 90 },
    ]

    return (
        <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center p-0 md:p-4">
            <div className="absolute inset-0 bg-black/45" onClick={onClose} />
            <div role="dialog" aria-modal="true" aria-label="选择保留时间" className="relative w-full md:max-w-sm rounded-t-2xl md:rounded-2xl bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-700 shadow-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title || '选择保留时间'}</h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 flex items-center justify-center">
                        <span className="material-icons-outlined text-[18px]">close</span>
                    </button>
                </div>

                <div className="max-h-48 overflow-y-auto no-scrollbar space-y-2 pr-1">
                    {options.map((item) => (
                        <button
                            key={item.value}
                            type="button"
                            onClick={() => onChange(item.value)}
                            className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${value === item.value
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>

                <div className="mt-5 flex justify-end gap-2">
                    <button onClick={onClose} className="h-9 px-4 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-600 bg-white/70 dark:bg-gray-700/70 hover:bg-gray-100 dark:hover:bg-gray-700">取消</button>
                    <button onClick={onSubmit} disabled={loading} className="h-9 px-4 rounded-lg text-sm font-medium bg-primary text-white hover:bg-blue-600 disabled:opacity-60">
                        {loading ? '保存中...' : '确定'}
                    </button>
                </div>
            </div>
        </div>
    )
}

function UsernameEditModal({ isOpen, username, onChange, onClose, onSubmit, loading }) {
    useEffect(() => {
        if (!isOpen) return
        const onKeyDown = (e) => {
            if (e.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [isOpen, onClose])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/45" onClick={onClose} />
            <div role="dialog" aria-modal="true" aria-label="修改用户名" className="relative w-full max-w-md rounded-2xl bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-700 shadow-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">修改用户名</h3>
                    <button onClick={onClose} className="w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-600 bg-white/70 dark:bg-gray-700/70 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center">
                        <span className="material-icons-outlined text-[18px]">close</span>
                    </button>
                </div>
                <input
                    autoFocus
                    type="text"
                    value={username}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="请输入新用户名"
                    maxLength={50}
                    className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:border-primary outline-none text-sm"
                />
                <p className="text-xs text-gray-500 dark:text-text-secondary mt-2">用户名 2-50 个字符。</p>
                <div className="mt-5 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">取消</button>
                    <button onClick={onSubmit} disabled={loading} className="px-4 py-2 rounded-lg text-sm bg-primary text-white hover:bg-blue-600 disabled:opacity-60">
                        {loading ? '保存中...' : '保存'}
                    </button>
                </div>
            </div>
        </div>
    )
}

function PasswordChangeModal({ isOpen, onClose, changePassword, showToast }) {
    const [oldPassword, setOldPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!isOpen) return
        const onKeyDown = (e) => {
            if (e.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [isOpen, onClose])

    if (!isOpen) return null

    const handleSubmit = async () => {
        if (!oldPassword || !newPassword) {
            showToast('请输入密码', 'error') // Replaced alert
            return
        }
        if (newPassword !== confirmPassword) {
            showToast('两次输入的密码不一致', 'error') // Replaced alert
            return
        }
        if (newPassword.length < 6) {
            showToast('新密码至少需要6位', 'error') // Replaced alert
            return
        }

        setLoading(true)
        try {
            await changePassword(oldPassword, newPassword)
            showToast('密码修改成功', 'success') // Replaced alert
            setOldPassword('')
            setNewPassword('')
            setConfirmPassword('')
            onClose()
        } catch (error) {
            showToast('修改失败: ' + error.message, 'error') // Replaced alert
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/45" onClick={onClose} />
            <div role="dialog" aria-modal="true" aria-label="修改密码" className="relative w-full max-w-md rounded-2xl bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-700 shadow-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">修改密码</h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 flex items-center justify-center">
                        <span className="material-icons-outlined text-[18px]">close</span>
                    </button>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary mb-1">当前密码</label>
                    <input
                        type="password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        className="w-full px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:border-primary focus:ring-0 text-gray-900 dark:text-white"
                        placeholder="请输入当前密码"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary mb-1">新密码</label>
                    <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:border-primary focus:ring-0 text-gray-900 dark:text-white"
                        placeholder="请输入新密码 (至少6位)"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary mb-1">确认新密码</label>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:border-primary focus:ring-0 text-gray-900 dark:text-white"
                        placeholder="请再次输入新密码"
                    />
                </div>

                <div className="pt-1 flex justify-end gap-2">
                    <button onClick={onClose} className={modalSecondaryBtnClass}>取消</button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="h-9 px-4 rounded-lg text-sm font-medium bg-primary text-white hover:bg-blue-600 disabled:opacity-60"
                    >
                        {loading ? '提交中...' : '修改密码'}
                    </button>
                </div>
            </div>
        </div>
    )
}
