function formatStorage(storageUsedBytes) {
    const gb = storageUsedBytes / 1024 / 1024 / 1024
    if (gb >= 1) return `${gb.toFixed(1)} GB`
    const mb = storageUsedBytes / 1024 / 1024
    if (mb >= 1) return `${mb.toFixed(1)} MB`
    return `${Math.round(storageUsedBytes / 1024)} KB`
}

function formatLastLogin(lastLoginAt) {
    if (!lastLoginAt) return '从未登录'
    const date = new Date(lastLoginAt)
    return date.toLocaleString('zh-CN', { hour12: false })
}

function csvCell(value) {
    const text = String(value ?? '')
    return `"${text.replace(/"/g, '""')}"`
}

function buildUsersCsv(users) {
    const rows = [
        ['用户名', '邮箱', '笔记数', '分组数', '存储占用', '账号状态', '最后登录'],
        ...users.map((user) => [
            user.username,
            user.email || '',
            user.noteCount,
            user.folderCount,
            formatStorage(user.storageUsedBytes || 0),
            user.isDisabled ? '已禁用' : '启用中',
            formatLastLogin(user.lastLoginAt),
        ]),
    ]
    return rows.map((row) => row.map(csvCell).join(',')).join('\n')
}

function UserAvatar({ user }) {
    return (
        <div className="w-9 h-9 rounded-full bg-[#eef1ff] dark:bg-[#162131] text-[#0d9488] dark:text-[#8cc7ff] flex items-center justify-center text-[11px] font-semibold overflow-hidden flex-shrink-0">
            {user.avatar ? <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" /> : user.username.slice(0, 2).toUpperCase()}
        </div>
    )
}

function StatusBadge({ isDisabled }) {
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold ${isDisabled ? 'bg-[#eef1f4] dark:bg-[#1c2635] text-[#64748b] dark:text-[#9fb0c7]' : 'bg-[#dcfce7] dark:bg-[rgba(34,197,94,0.14)] text-[#15803d] dark:text-[#6ddf9a]'}`}>
            {isDisabled ? '已禁用' : '启用中'}
        </span>
    )
}

export default function AdminUsersPanel({
    users,
    allFilteredUsers,
    totalUsers,
    filteredCount,
    currentPage,
    pageCount,
    statusFilter,
    onStatusFilterChange,
    onPageChange,
    onOpenPasswordModal,
    onToggleStatus,
}) {
    const handleExportUsersCsv = () => {
        const csv = buildUsersCsv(allFilteredUsers)
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `mynote-users-${Date.now()}.csv`
        link.click()
        setTimeout(() => URL.revokeObjectURL(url), 0)
    }

    const handlePrintUsers = () => {
        window.print()
    }

    const canGoPrevious = currentPage > 1
    const canGoNext = currentPage < pageCount
    const visibleStart = filteredCount === 0 ? 0 : (currentPage - 1) * 8 + 1
    const visibleEnd = Math.min(filteredCount, visibleStart + users.length - 1)

    const iconButtonClass = 'w-9 h-9 rounded-lg border border-transparent text-[#596173] dark:text-[#8fa0b6] hover:text-[#0f766e] hover:bg-[#ecfdf5] dark:hover:bg-[#162131] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488]'

    return (
        <section className="mb-6">
            <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="text-sm font-semibold text-[#202636] dark:text-text-main">用户管理</h2>
                <span className="text-xs text-[#64748b] dark:text-[#8fa0b6]">共 {totalUsers} 位用户</span>
            </div>

            <div className="rounded-lg border border-[#e2e8f0] dark:border-[#283445] bg-white dark:bg-[#111925] shadow-[0_8px_24px_rgba(15,23,42,0.05)] overflow-hidden">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between px-4 py-3 border-b border-[#eef2f7] dark:border-[#283445] bg-white/96 dark:bg-[#111925]">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <label className="inline-flex items-center gap-2 rounded-lg border border-[#dbe4ef] dark:border-[#283445] bg-[#fbfcfe] dark:bg-[#0f1722] px-3 py-2 text-[13px] font-medium text-[#475569] dark:text-[#9fb0c7]">
                            <span className="material-icons-outlined text-[16px]">filter_alt</span>
                            <span>筛选账号状态</span>
                            <select
                                value={statusFilter}
                                onChange={(event) => onStatusFilterChange(event.target.value)}
                                className="bg-transparent text-[#1f2937] dark:text-text-main focus-visible:outline-none"
                                aria-label="筛选账号状态"
                            >
                                <option value="all">全部</option>
                                <option value="active">启用中</option>
                                <option value="disabled">已禁用</option>
                            </select>
                        </label>
                        <span className="text-xs text-[#64748b] dark:text-[#8fa0b6]">显示 {visibleStart}-{visibleEnd} / 共 {filteredCount} 位用户</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#64748b] dark:text-[#8fa0b6]">
                        <span>数据导出：</span>
                        <button type="button" onClick={handleExportUsersCsv} className={iconButtonClass} aria-label="导出用户 CSV" title="导出用户 CSV">
                            <span className="material-icons-outlined text-[18px]">grid_on</span>
                        </button>
                        <button type="button" onClick={handlePrintUsers} className={iconButtonClass} aria-label="打印用户列表" title="打印用户列表">
                            <span className="material-icons-outlined text-[18px]">print</span>
                        </button>
                    </div>
                </div>

                <div className="hidden md:block px-4 py-4 overflow-x-auto">
                    <div className="min-w-[1064px]">
                        <div className="grid grid-cols-[minmax(220px,1.4fr)_100px_100px_160px_110px_130px_140px] gap-4 text-[11px] font-semibold text-[#64748b] dark:text-[#8fa0b6] mb-3 px-2">
                            <div>用户信息 / 邮箱</div>
                            <div>笔记数</div>
                            <div>所属组</div>
                            <div>存储占用</div>
                            <div>账号状态</div>
                            <div>最后登录</div>
                            <div className="text-right">管理操作</div>
                        </div>

                        <div className="space-y-1">
                            {users.map((user) => (
                                <div key={user.id} className="grid grid-cols-[minmax(220px,1.4fr)_100px_100px_160px_110px_130px_140px] gap-4 items-center px-2 py-3 rounded-lg hover:bg-[#f8fafc] dark:hover:bg-[#162131] transition-colors">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <UserAvatar user={user} />
                                        <div className="min-w-0">
                                            <div className="text-[13px] font-semibold text-[#1f2532] dark:text-text-main truncate">{user.username}</div>
                                            <div className="text-[11px] text-[#64748b] dark:text-[#7f8da3] truncate">{user.email || '-'}</div>
                                        </div>
                                    </div>
                                    <div className="text-[13px] font-semibold text-[#232938] dark:text-text-main">{user.noteCount.toLocaleString()}</div>
                                    <div className="text-[13px] text-[#475569] dark:text-[#9fb0c7]">{user.folderCount}</div>
                                    <div>
                                        <div className="text-[12px] font-medium text-[#2a3140] dark:text-text-main mb-1">{formatStorage(user.storageUsedBytes || 0)}</div>
                                        <div className="h-1.5 rounded-full bg-[#e2e8f0] dark:bg-[#1c2635] overflow-hidden">
                                            <div className={`h-full rounded-full ${(user.storageUsedBytes || 0) > 10 * 1024 * 1024 * 1024 ? 'bg-[#de3d3d]' : 'bg-[#0d9488]'}`} style={{ width: `${Math.min(100, Math.max(8, (user.storageUsedBytes || 0) / (1024 * 1024 * 400)))}%` }} />
                                        </div>
                                    </div>
                                    <div><StatusBadge isDisabled={user.isDisabled} /></div>
                                    <div className="text-[12px] text-[#64748b] dark:text-[#8fa0b6]">{formatLastLogin(user.lastLoginAt)}</div>
                                    <div className="flex items-center justify-end gap-1.5">
                                        {!user.isAdmin && (
                                            <>
                                                <button type="button" onClick={() => onOpenPasswordModal(user)} className={iconButtonClass} title="更改密码" aria-label={`更改 ${user.username} 的密码`}>
                                                    <span className="material-icons-outlined text-[18px]">lock_reset</span>
                                                </button>
                                                <button type="button" onClick={() => onToggleStatus(user)} className={iconButtonClass} title={user.isDisabled ? '启用用户' : '禁用用户'} aria-label={`${user.isDisabled ? '启用' : '禁用'} ${user.username}`}>
                                                    <span className="material-icons-outlined text-[18px]">{user.isDisabled ? 'check_circle' : 'block'}</span>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="md:hidden px-4 py-4 space-y-3" aria-label="用户卡片列表">
                    {users.map((user) => (
                        <article key={user.id} className="rounded-lg border border-[#e2e8f0] dark:border-[#283445] bg-[#fbfcfe] dark:bg-[#0f1722] p-3">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <UserAvatar user={user} />
                                    <div className="min-w-0">
                                        <div className="text-[14px] font-semibold text-[#1f2532] dark:text-text-main truncate">{user.username}</div>
                                        <div className="text-[12px] text-[#64748b] dark:text-[#9fb0c7] truncate">{user.email || '-'}</div>
                                    </div>
                                </div>
                                <StatusBadge isDisabled={user.isDisabled} />
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-3 text-[12px]">
                                <div className="rounded-md bg-white dark:bg-[#111925] border border-[#e2e8f0] dark:border-[#283445] px-2.5 py-2">
                                    <div className="text-[#64748b] dark:text-[#8fa0b6]">笔记数</div>
                                    <div className="mt-1 font-semibold text-[#1f2532] dark:text-text-main">{user.noteCount.toLocaleString()}</div>
                                </div>
                                <div className="rounded-md bg-white dark:bg-[#111925] border border-[#e2e8f0] dark:border-[#283445] px-2.5 py-2">
                                    <div className="text-[#64748b] dark:text-[#8fa0b6]">所属组</div>
                                    <div className="mt-1 font-semibold text-[#1f2532] dark:text-text-main">{user.folderCount}</div>
                                </div>
                                <div className="rounded-md bg-white dark:bg-[#111925] border border-[#e2e8f0] dark:border-[#283445] px-2.5 py-2">
                                    <div className="text-[#64748b] dark:text-[#8fa0b6]">存储占用</div>
                                    <div className="mt-1 font-semibold text-[#1f2532] dark:text-text-main">{formatStorage(user.storageUsedBytes || 0)}</div>
                                </div>
                                <div className="rounded-md bg-white dark:bg-[#111925] border border-[#e2e8f0] dark:border-[#283445] px-2.5 py-2">
                                    <div className="text-[#64748b] dark:text-[#8fa0b6]">最后登录</div>
                                    <div className="mt-1 font-semibold text-[#1f2532] dark:text-text-main truncate">{formatLastLogin(user.lastLoginAt)}</div>
                                </div>
                            </div>
                            {!user.isAdmin && (
                                <div className="mt-3 flex items-center justify-end gap-2">
                                    <button type="button" onClick={() => onOpenPasswordModal(user)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#dbe4ef] dark:border-[#283445] bg-white dark:bg-[#111925] px-3 py-2 text-[12px] font-medium text-[#334155] dark:text-[#9fb0c7]" title="更改密码">
                                        <span className="material-icons-outlined text-[16px]">lock_reset</span>
                                        更改密码
                                    </button>
                                    <button type="button" onClick={() => onToggleStatus(user)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#0d9488] px-3 py-2 text-[12px] font-semibold text-white">
                                        <span className="material-icons-outlined text-[16px]">{user.isDisabled ? 'check_circle' : 'block'}</span>
                                        {user.isDisabled ? '启用' : '禁用'}
                                    </button>
                                </div>
                            )}
                        </article>
                    ))}
                </div>

                {filteredCount === 0 && (
                    <div className="px-5 py-10 text-center text-sm text-[#64748b] dark:text-[#9fb0c7]">
                        没有匹配的用户
                    </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-t border-[#eef2f7] dark:border-[#283445] text-[12px] text-[#64748b] dark:text-[#8fa0b6]">
                    <span>第 {currentPage} / {pageCount} 页</span>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => onPageChange(currentPage - 1)} disabled={!canGoPrevious} className="px-3 py-2 rounded-lg bg-[#f3f5f8] dark:bg-[#162131] text-[#475569] dark:text-[#9fb0c7] disabled:opacity-45 disabled:cursor-not-allowed">上一页</button>
                        <button type="button" onClick={() => onPageChange(currentPage + 1)} disabled={!canGoNext} className="px-3 py-2 rounded-lg bg-[#0d9488] text-white disabled:opacity-45 disabled:cursor-not-allowed">下一页</button>
                    </div>
                </div>
            </div>
        </section>
    )
}
