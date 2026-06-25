import { useEffect, useMemo, useState } from 'react'
import { adminApi } from '../../api'
import { useToast } from '../../contexts/ToastContext'
import AdminUsersPanel from './AdminUsersPanel'

const PAGE_SIZE = 8

function formatStorageValue(bytes) {
    const tb = bytes / 1024 / 1024 / 1024 / 1024
    if (tb >= 1) return `${tb.toFixed(1)} TB`
    const gb = bytes / 1024 / 1024 / 1024
    if (gb >= 1) return `${gb.toFixed(1)} GB`
    const mb = bytes / 1024 / 1024
    if (mb >= 1) return `${mb.toFixed(1)} MB`
    return `${Math.max(0, Math.round(bytes / 1024))} KB`
}

function formatNoteCount(value) {
    if (value < 1000) return String(value)
    return `${(value / 1000).toFixed(1)}k`
}

function normalizeSearchValue(value) {
    return String(value || '').trim().toLowerCase()
}

export default function AdminPage({ currentSection = 'users' }) {
    const { showToast } = useToast()
    const [loading, setLoading] = useState(true)
    const [settings, setSettings] = useState({ allowRegistration: true })
    const [exporting, setExporting] = useState(false)
    const [validating, setValidating] = useState(false)
    const [updatingRegistration, setUpdatingRegistration] = useState(false)
    const [creatingUser, setCreatingUser] = useState(false)
    const [resettingPassword, setResettingPassword] = useState(false)
    const [validationResult, setValidationResult] = useState(null)
    const [users, setUsers] = useState([])
    const [overview, setOverview] = useState({ totalUsers: 0, totalNotes: 0, totalStorageUsedBytes: 0, allowRegistration: true })
    const [showCreateUserModal, setShowCreateUserModal] = useState(false)
    const [newUserForm, setNewUserForm] = useState({ username: '', email: '', password: '' })
    const [passwordModalUser, setPasswordModalUser] = useState(null)
    const [passwordDraft, setPasswordDraft] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [currentPage, setCurrentPage] = useState(1)

    const totalUsers = overview.totalUsers
    const totalNotes = overview.totalNotes
    const totalStorageUsedBytes = overview.totalStorageUsedBytes
    const isSettingsSection = currentSection === 'settings'
    const pageTitle = isSettingsSection ? '全局设置' : '用户管理控制中心'
    const pageDescription = isSettingsSection
        ? '管理实例级注册策略、数据导出与导入预检。'
        : '检索账号、调整状态并查看全系统资源使用情况。'

    const filteredUsers = useMemo(() => {
        const query = normalizeSearchValue(searchQuery)
        return users.filter((item) => {
            const matchesQuery = !query || [item.username, item.email, item.id]
                .some((value) => normalizeSearchValue(value).includes(query))
            const matchesStatus = statusFilter === 'all'
                || (statusFilter === 'active' && !item.isDisabled)
                || (statusFilter === 'disabled' && item.isDisabled)
            return matchesQuery && matchesStatus
        })
    }, [searchQuery, statusFilter, users])

    const pageCount = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE))
    const safeCurrentPage = Math.min(currentPage, pageCount)
    const pagedUsers = useMemo(() => {
        const start = (safeCurrentPage - 1) * PAGE_SIZE
        return filteredUsers.slice(start, start + PAGE_SIZE)
    }, [filteredUsers, safeCurrentPage])

    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery, statusFilter])

    useEffect(() => {
        if (currentPage > pageCount) {
            setCurrentPage(pageCount)
        }
    }, [currentPage, pageCount])

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            try {
                const overviewData = await adminApi.getOverview()
                const data = await adminApi.getSettings()
                const userList = await adminApi.getUsers()
                setOverview(overviewData)
                setSettings(data)
                setUsers(userList)
            } catch (error) {
                showToast('加载管理员设置失败: ' + error.message, 'error')
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [showToast])

    const handleToggleRegistration = async () => {
        setUpdatingRegistration(true)
        try {
            const next = await adminApi.updateRegistration(!settings.allowRegistration)
            setSettings(next)
            setOverview((prev) => ({ ...prev, allowRegistration: next.allowRegistration }))
            showToast(`注册已${next.allowRegistration ? '开启' : '关闭'}`, 'success')
        } catch (error) {
            showToast('更新注册开关失败: ' + error.message, 'error')
        } finally {
            setUpdatingRegistration(false)
        }
    }

    const handleOpenPasswordModal = (user) => {
        setPasswordModalUser(user)
        setPasswordDraft('')
    }

    const handleSubmitPasswordChange = async (event) => {
        event?.preventDefault()
        if (!passwordDraft.trim() || !passwordModalUser) {
            showToast('请输入新密码', 'warning')
            return
        }

        setResettingPassword(true)
        try {
            await adminApi.resetUserPassword(passwordModalUser.id, passwordDraft.trim())
            showToast(`已修改 ${passwordModalUser.username} 的密码`, 'success')
            setPasswordModalUser(null)
            setPasswordDraft('')
        } catch (error) {
            showToast('修改密码失败: ' + error.message, 'error')
        } finally {
            setResettingPassword(false)
        }
    }

    const handleToggleUserStatus = async (user) => {
        try {
            const result = await adminApi.setUserStatus(user.id, !user.isDisabled)
            setUsers((prev) => prev.map((item) => item.id === user.id ? { ...item, isDisabled: result.isDisabled } : item))
            showToast(`${user.username} 已${result.isDisabled ? '禁用' : '启用'}`, 'success')
        } catch (error) {
            showToast('更新用户状态失败: ' + error.message, 'error')
        }
    }

    const handleCreateUser = async (event) => {
        event?.preventDefault()
        if (!newUserForm.username.trim() || !newUserForm.password.trim()) {
            showToast('请输入用户名和密码', 'warning')
            return
        }

        setCreatingUser(true)
        try {
            const created = await adminApi.createUser({
                username: newUserForm.username.trim(),
                email: newUserForm.email.trim() || null,
                password: newUserForm.password.trim(),
            })
            const userList = await adminApi.getUsers()
            const overviewData = await adminApi.getOverview()
            setUsers(userList)
            setOverview(overviewData)
            setShowCreateUserModal(false)
            setNewUserForm({ username: '', email: '', password: '' })
            setCurrentPage(1)
            showToast(`已创建用户 ${created.username}`, 'success')
        } catch (error) {
            showToast('新增用户失败: ' + error.message, 'error')
        } finally {
            setCreatingUser(false)
        }
    }

    const handleExport = async () => {
        setExporting(true)
        try {
            const { blob, filename } = await adminApi.exportBackup()
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = filename
            link.click()
            setTimeout(() => URL.revokeObjectURL(url), 0)
            showToast('实例备份已导出', 'success')
        } catch (error) {
            showToast('导出实例数据失败: ' + error.message, 'error')
        } finally {
            setExporting(false)
        }
    }

    const handleImportValidate = async (event) => {
        const file = event.target.files?.[0]
        if (!file) return
        event.target.value = null
        setValidating(true)
        try {
            const text = await file.text()
            const payload = JSON.parse(text)
            const result = await adminApi.validateBackupImport(payload)
            setValidationResult(result)
            showToast('导入预检完成', 'success')
        } catch (error) {
            setValidationResult(null)
            showToast('导入预检失败: ' + error.message, 'error')
        } finally {
            setValidating(false)
        }
    }

    const fieldClass = 'w-full px-3 py-2.5 rounded-lg border border-[#dce3ee] dark:border-[#283445] bg-[#f8fbff] dark:bg-[#0f1722] text-[#1c2433] dark:text-text-main text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488]'
    const secondaryButtonClass = 'px-3.5 py-2.5 rounded-lg border border-[#dbe4ef] dark:border-[#283445] bg-white dark:bg-[#162131] text-[#4d5668] dark:text-[#9fb0c7] text-sm font-medium hover:bg-[#f3f7fb] dark:hover:bg-[#1b2a3b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488]'
    const primaryButtonClass = 'px-3.5 py-2.5 rounded-lg bg-[#0d9488] text-white text-sm font-semibold hover:bg-[#0f766e] disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14b8a6]'

    return (
        <div className="editor-stage flex-1 overflow-y-auto px-4 py-4 md:p-5 md:pl-5 text-[#1c2433] dark:text-text-main">
            <div className="max-w-[1400px] mx-auto">
                <main className="bg-transparent">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-5">
                        <label className="relative w-full lg:max-w-[460px]">
                            <span className="sr-only">搜索用户</span>
                            <span className="material-icons-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#64748b] dark:text-[#7f8da3]">search</span>
                            <input
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                aria-label="搜索用户"
                                placeholder="快速检索用户、邮箱或账号 ID"
                                className="w-full h-11 rounded-lg border border-[#dbe4ef] dark:border-[#283445] bg-white dark:bg-[#111925] pl-10 pr-3 text-sm text-[#1c2433] dark:text-text-main placeholder:text-[#94a3b8] dark:placeholder:text-[#7f8da3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488]"
                            />
                        </label>
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="inline-flex items-center gap-2 rounded-lg bg-[#dcfce7] dark:bg-[rgba(34,197,94,0.14)] px-3 py-2 text-[12px] font-semibold text-[#15803d] dark:text-[#6ddf9a]">
                                <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
                                系统运行良好
                            </div>
                            {!isSettingsSection && (
                                <button type="button" onClick={() => setShowCreateUserModal(true)} className={primaryButtonClass}>
                                    <span className="material-icons-outlined align-[-4px] mr-1 text-[18px]">person_add</span>
                                    新增用户账号
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 mb-4">
                        <h1 className="text-[26px] md:text-[32px] leading-tight font-bold text-[#18202f] dark:text-text-main">{pageTitle}</h1>
                        <p className="text-[14px] leading-6 text-[#64748b] dark:text-[#9fb0c7]">{pageDescription}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[0.9fr_0.9fr_1.2fr] gap-3 mb-4">
                        <div className="rounded-lg bg-white dark:bg-[#111925] border border-[#e2e8f0] dark:border-[#283445] px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
                            <div className="flex items-center justify-between mb-3">
                                <span className="material-icons-outlined text-[20px] text-[#0d9488]">group</span>
                                <span className="text-[12px] font-medium text-[#64748b] dark:text-[#8fa0b6]">非管理员账号</span>
                            </div>
                            <div className="text-[12px] text-[#64748b] dark:text-[#8fa0b6] mb-1">活跃用户总数</div>
                            <div className="text-[28px] font-bold text-[#1d2432] dark:text-text-main">{loading ? '--' : totalUsers.toLocaleString()}</div>
                        </div>

                        <div className="rounded-lg bg-white dark:bg-[#111925] border border-[#e2e8f0] dark:border-[#283445] px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
                            <div className="flex items-center justify-between mb-3">
                                <span className="material-icons-outlined text-[20px] text-[#0d9488]">description</span>
                                <span className="text-[12px] font-medium text-[#64748b] dark:text-[#8fa0b6]">当前总量</span>
                            </div>
                            <div className="text-[12px] text-[#64748b] dark:text-[#8fa0b6] mb-1">笔记创建总量</div>
                            <div className="text-[28px] font-bold text-[#1d2432] dark:text-text-main">{loading ? '--' : formatNoteCount(totalNotes)}</div>
                        </div>

                        <div className="rounded-lg bg-[#134e4a] dark:bg-[#182432] text-white px-4 py-3 shadow-[0_12px_28px_rgba(19,78,74,0.18)] sm:col-span-2 xl:col-span-1">
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="text-[12px] text-white/82">系统总存储占用</div>
                                <div className="px-2 py-1 rounded-md bg-white/14 text-[11px] font-semibold whitespace-nowrap">{overview.allowRegistration ? '已开放注册' : '已关闭注册'}</div>
                            </div>
                            <div className="text-[28px] font-bold mb-3">{loading ? '--' : formatStorageValue(totalStorageUsedBytes)}</div>
                            <div className="h-2 rounded-full bg-white/12 overflow-hidden">
                                <div className="h-full bg-[#f97316] rounded-full" style={{ width: `${Math.min(100, Math.max(6, (totalStorageUsedBytes / (1024 * 1024 * 1024)) / 0.25))}%` }} />
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-white/72">
                                <span>用户数据: {loading ? '--' : formatStorageValue(totalStorageUsedBytes)}</span>
                                <span>统计基于笔记正文</span>
                            </div>
                        </div>
                    </div>

                    {validationResult && (
                        <div className="mb-4 rounded-lg bg-[#eef3f8] dark:bg-[#111925] border border-[#dde6f1] dark:border-[#283445] px-4 py-3 text-[13px] text-[#475569] dark:text-[#9fb0c7]">
                            实例备份预检：{validationResult.valid ? '通过' : '失败'} · 模式：{validationResult.mode}
                        </div>
                    )}

                    {currentSection === 'users' && (
                        <AdminUsersPanel
                            users={pagedUsers}
                            allFilteredUsers={filteredUsers}
                            totalUsers={users.length}
                            filteredCount={filteredUsers.length}
                            currentPage={safeCurrentPage}
                            pageCount={pageCount}
                            statusFilter={statusFilter}
                            onStatusFilterChange={setStatusFilter}
                            onPageChange={setCurrentPage}
                            onOpenPasswordModal={handleOpenPasswordModal}
                            onToggleStatus={handleToggleUserStatus}
                        />
                    )}

                    {currentSection === 'settings' && (
                        <div className="rounded-lg border border-[#e2e8f0] dark:border-[#283445] bg-white dark:bg-[#111925] shadow-[0_8px_24px_rgba(15,23,42,0.05)] p-4 md:p-6 text-[#475569] dark:text-[#9fb0c7]">
                            <div className="text-[18px] font-bold text-[#1c2433] dark:text-text-main mb-4">全局设置</div>
                            <div className="space-y-4 text-sm">
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between rounded-lg border border-[#e2e8f0] dark:border-[#283445] bg-[#f8fbff] dark:bg-[#0f1722] px-4 py-4">
                                    <div>
                                        <div className="font-semibold text-[#1f2532] dark:text-text-main">注册开关</div>
                                        <div className="text-[#64748b] dark:text-[#9fb0c7]">当前状态：{settings.allowRegistration ? '已开启' : '已关闭'}</div>
                                    </div>
                                    <button type="button" onClick={handleToggleRegistration} disabled={updatingRegistration} className={primaryButtonClass}>
                                        {updatingRegistration ? '更新中...' : settings.allowRegistration ? '关闭注册' : '开启注册'}
                                    </button>
                                </div>
                                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[#e2e8f0] dark:border-[#283445] bg-[#f8fbff] dark:bg-[#0f1722] px-4 py-4">
                                    <button type="button" onClick={handleExport} disabled={exporting} className={secondaryButtonClass}>
                                        <span className="material-icons-outlined align-[-4px] mr-1 text-[18px]">download</span>
                                        {exporting ? '导出中...' : '导出实例数据'}
                                    </button>
                                    <label className={`${secondaryButtonClass} cursor-pointer ${validating ? 'opacity-60 pointer-events-none' : ''}`}>
                                        <span className="material-icons-outlined align-[-4px] mr-1 text-[18px]">upload_file</span>
                                        {validating ? '预检中...' : '导入备份预检'}
                                        <input type="file" accept=".json,application/json" className="hidden" onChange={handleImportValidate} disabled={validating} />
                                    </label>
                                </div>
                                {validationResult && (
                                    <div className="rounded-lg bg-[#eef3f8] dark:bg-[#162131] border border-[#dde6f1] dark:border-[#283445] px-4 py-3 text-[13px] text-[#475569] dark:text-[#9fb0c7]">
                                        实例备份预检：{validationResult.valid ? '通过' : '失败'} · 模式：{validationResult.mode}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {showCreateUserModal && (
                <div className="fixed inset-0 z-[1400] bg-[rgba(12,18,28,0.32)] dark:bg-[rgba(2,8,20,0.62)] flex items-center justify-center p-4">
                    <form role="dialog" aria-modal="true" aria-labelledby="create-user-title" onSubmit={handleCreateUser} className="w-full max-w-md rounded-lg bg-white dark:bg-[#111925] border border-[#dfe7f2] dark:border-[#283445] shadow-[0_28px_80px_rgba(91,101,121,0.24)] dark:shadow-[0_32px_80px_rgba(2,6,14,0.45)] p-5">
                        <div id="create-user-title" className="text-[22px] font-bold text-[#18202f] dark:text-text-main mb-4">新增用户账号</div>
                        <div className="space-y-3">
                            <label className="block">
                                <span className="block mb-1.5 text-[13px] font-medium text-[#475569] dark:text-[#9fb0c7]">用户名</span>
                                <input id="new-user-username" value={newUserForm.username} onChange={(e) => setNewUserForm((prev) => ({ ...prev, username: e.target.value }))} autoComplete="username" className={fieldClass} />
                            </label>
                            <label className="block">
                                <span className="block mb-1.5 text-[13px] font-medium text-[#475569] dark:text-[#9fb0c7]">邮箱（可选）</span>
                                <input id="new-user-email" type="email" value={newUserForm.email} onChange={(e) => setNewUserForm((prev) => ({ ...prev, email: e.target.value }))} autoComplete="email" className={fieldClass} />
                            </label>
                            <label className="block" htmlFor="new-user-password">
                                <span className="block mb-1.5 text-[13px] font-medium text-[#475569] dark:text-[#9fb0c7]">初始密码</span>
                                <input id="new-user-password" type="password" value={newUserForm.password} onChange={(e) => setNewUserForm((prev) => ({ ...prev, password: e.target.value }))} autoComplete="new-password" className={fieldClass} />
                            </label>
                        </div>
                        <div className="mt-5 flex justify-end gap-3">
                            <button type="button" onClick={() => setShowCreateUserModal(false)} className={secondaryButtonClass}>取消</button>
                            <button type="submit" disabled={creatingUser} className={primaryButtonClass}>{creatingUser ? '创建中...' : '创建账号'}</button>
                        </div>
                    </form>
                </div>
            )}

            {passwordModalUser && (
                <div className="fixed inset-0 z-[1400] bg-[rgba(12,18,28,0.32)] dark:bg-[rgba(2,8,20,0.62)] flex items-center justify-center p-4">
                    <form role="dialog" aria-modal="true" aria-labelledby="reset-password-title" onSubmit={handleSubmitPasswordChange} className="w-full max-w-md rounded-lg bg-white dark:bg-[#111925] border border-[#dfe7f2] dark:border-[#283445] shadow-[0_28px_80px_rgba(91,101,121,0.24)] dark:shadow-[0_32px_80px_rgba(2,6,14,0.45)] p-5">
                        <div id="reset-password-title" className="text-[22px] font-bold text-[#18202f] dark:text-text-main mb-2">更改密码</div>
                        <div className="text-sm text-[#64748b] dark:text-[#9fb0c7] mb-5">为用户 {passwordModalUser.username} 设置新的登录密码。</div>
                        <label className="block" htmlFor="reset-user-password">
                            <span className="block mb-1.5 text-[13px] font-medium text-[#475569] dark:text-[#9fb0c7]">新密码</span>
                            <input
                                id="reset-user-password"
                                type="password"
                                value={passwordDraft}
                                onChange={(e) => setPasswordDraft(e.target.value)}
                                autoComplete="new-password"
                                className={fieldClass}
                            />
                        </label>
                        <div className="mt-5 flex justify-end gap-3">
                            <button type="button" onClick={() => setPasswordModalUser(null)} className={secondaryButtonClass}>取消</button>
                            <button type="submit" disabled={resettingPassword} className={primaryButtonClass}>{resettingPassword ? '修改中...' : '确认修改'}</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    )
}
