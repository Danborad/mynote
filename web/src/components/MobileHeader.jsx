import { useAuth } from '../contexts/AuthContext'
import { useNotes } from '../contexts/NotesContext'
import { usePrompt } from './ConfirmModal'

function MobileHeader({ onMenuClick, onSearchOpen, onCreateFolder }) {
    const { user } = useAuth()
    const { currentView, currentFolderId, folders, switchView, selectedNote } = useNotes()
    const { prompt, PromptDialog } = usePrompt()
    const shouldShowMobileTabs = currentView === 'all' || currentView === 'folder'
    const mobileTabs = [
        { id: 'all', label: '全部', onClick: () => switchView('all'), active: currentView === 'all' },
        ...(folders || []).slice(0, 4).map((folder) => ({
            id: folder.id,
            label: folder.name,
            onClick: () => switchView('folder', folder.id),
            active: currentView === 'folder' && currentFolderId === folder.id,
        })),
    ]

    // 打开笔记时隐藏整个 MobileHeader（Editor 自带顶栏+返回键）
    if (selectedNote) return null

    return (
        <header className="md:hidden sticky top-0 z-30 bg-white border-b border-[#eef2f6] dark:bg-[#111925] dark:border-[#243244]">
            <div className="px-4 pt-[max(18px,env(safe-area-inset-top))] pb-0">
                <div className="flex items-center justify-between gap-3 px-0 pb-3">
                    <div className="flex items-center gap-4 min-w-0">
                        <button
                            className="flex h-10 w-10 items-center justify-center text-[#556070] transition-colors dark:text-[#a8b4c2]"
                            onClick={onMenuClick}
                        >
                            <span className="material-icons-outlined text-[32px] leading-none">menu</span>
                        </button>
                        <div className="min-w-0 select-none">
                            <div className="flex items-end gap-0.5 leading-none">
                                <span className="text-[18px] font-black tracking-[-0.04em] text-[#5a84ff]">My</span>
                                <span className="text-[18px] font-black tracking-[-0.04em] text-[#1f2a3d] dark:text-[#f5f7fb]">Note</span>
                            </div>
                            <div className="mt-1 text-[11px] leading-none text-[#a3adbd] dark:text-[#7f8da3]">Settings Center</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={onSearchOpen} className="flex h-10 w-10 items-center justify-center text-[#556070] transition-colors dark:text-[#a8b4c2]">
                            <span className="material-icons-outlined text-[24px] leading-none">search</span>
                        </button>
                        <div className="relative flex items-center justify-center">
                            <div className="h-11 w-11 overflow-hidden rounded-full bg-[#2f3b4b] shadow-[0_4px_12px_rgba(15,23,42,0.12)]">
                                {user?.avatar ? (
                                    <img src={user.avatar} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                                        {user?.username?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                {shouldShowMobileTabs && (
                    <div className="border-t border-[#f1f3f7] px-0 py-3 dark:border-[#243244]">
                        <div className="w-full overflow-x-auto no-scrollbar">
                            <div className="flex items-center gap-3 min-w-max pr-2">
                                {mobileTabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={tab.onClick}
                                        className={`rounded-[16px] px-5 py-2.5 text-[13px] font-semibold whitespace-nowrap transition-all active:scale-95 ${tab.active
                                            ? 'bg-[#1157db] text-white shadow-[0_6px_14px_rgba(17,87,219,0.22)] dark:bg-[#2563eb] dark:text-white'
                                            : 'bg-[#f1f3f6] text-[#666f7f] dark:bg-[#182331] dark:text-[#a8b4c2]'
                                            }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                                <button
                                    onClick={async () => {
                                        const name = (await prompt({ title: '创建分组', placeholder: '请输入分组名称' }))?.trim()
                                        if (!name) return
                                        onCreateFolder?.(name)
                                    }}
                                    className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-[#f1f3f6] text-[#666f7f] transition-all active:scale-95 dark:bg-[#182331] dark:text-[#a8b4c2]"
                                    aria-label="创建分组"
                                    title="创建分组"
                                >
                                    <span className="material-icons-outlined text-[18px] leading-none">add</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <PromptDialog />
        </header>
    )
}

export default MobileHeader
