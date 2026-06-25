import { useState, useEffect, Suspense, lazy } from 'react'
import 'highlight.js/styles/github-dark.css'
import { useAuth } from './contexts/AuthContext.jsx'
import { ToastProvider } from './contexts/ToastContext.jsx'
import { useNotes } from './contexts/NotesContext.jsx'
import MobileDock from './components/MobileDock'
import SettingsPage from './components/SettingsPage'
import ShareLinksPage from './components/ShareLinksPage'
import AdminPage from './components/admin/AdminPage'

const Sidebar = lazy(() => import('./components/Sidebar.jsx'))
const NoteList = lazy(() => import('./components/NoteList.jsx'))
const Editor = lazy(() => import('./components/Editor.jsx'))
const MobileHeader = lazy(() => import('./components/MobileHeader.jsx'))
const SearchModal = lazy(() => import('./components/SearchModal.jsx'))
const LoginPage = lazy(() => import('./components/LoginPage.jsx'))
const SharedNotePage = lazy(() => import('./components/SharedNotePage.jsx'))

function ScreenFallback() {
    return (
        <div className="bg-background-light dark:bg-background-dark min-h-screen flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    )
}

function AdminMobileHeader({ onMenuClick, currentSection }) {
    return (
        <header className="md:hidden flex-shrink-0 bg-[#f8fafc] dark:bg-[#0f1722] border-b border-[#e2e8f0] dark:border-[#283445] px-4 pt-[calc(env(safe-area-inset-top)+10px)] pb-3">
            <div className="flex items-center justify-between gap-3">
                <button
                    type="button"
                    onClick={onMenuClick}
                    aria-label="打开管理员导航"
                    className="w-11 h-11 rounded-lg border border-[#d9e2ef] dark:border-[#283445] bg-white dark:bg-[#111925] text-[#344054] dark:text-text-main flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488]"
                >
                    <span className="material-icons-outlined text-[22px]">menu</span>
                </button>
                <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-bold text-[#142033] dark:text-text-main truncate">管理员后台</div>
                    <div className="text-[12px] text-[#64748b] dark:text-[#9fb0c7] truncate">{currentSection === 'settings' ? '全局设置' : '用户管理'}</div>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#dcfce7] dark:bg-[rgba(34,197,94,0.14)] px-2.5 py-2 text-[12px] font-semibold text-[#15803d] dark:text-[#6ddf9a]">
                    <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
                    正常
                </div>
            </div>
        </header>
    )
}

function MainContent() {
    const { user, loading: authLoading, logout } = useAuth()
    const {
        notes,
        selectedNote,
        setSelectedNote,
        loading: notesLoading,
        currentView,
        switchView,
        createNote,
        createFolder,
        folders,
        favoritesCount,
        trashCount,
        allNotesCount,
    } = useNotes()

    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [isSearchOpen, setIsSearchOpen] = useState(false)
    const [lastBoardView, setLastBoardView] = useState('all')
    const [adminSection, setAdminSection] = useState('users')
    const [draftNote, setDraftNote] = useState(null)

    const activeNote = selectedNote || draftNote

    const openDraftNote = () => {
        setSelectedNote(null)
        setDraftNote({
            id: null,
            title: '',
            content: '',
            folderId: null,
            isFavorite: false,
            isPinned: false,
            isDeleted: false,
            createdAt: null,
            updatedAt: null,
            _isDraft: true,
        })
    }

    const closeActiveEditor = () => {
        setSelectedNote(null)
        setDraftNote(null)
    }

    const handleCreateFolder = async (name) => {
        const trimmedName = name?.trim()
        if (!trimmedName) return
        await createFolder(trimmedName)
    }

    useEffect(() => {
        if (currentView !== 'settings' && currentView !== 'shares' && currentView !== 'admin') {
            setLastBoardView(currentView)
        }
    }, [currentView])

    useEffect(() => {
        if (!selectedNote?.id) return
        setDraftNote(null)
    }, [selectedNote?.id])

    const boardView = currentView === 'settings' || currentView === 'shares' || currentView === 'admin' ? lastBoardView : currentView

    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault()
                setIsSearchOpen(true)
            }
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [])

    if (authLoading) {
        return (
            <div className="bg-background-light dark:bg-background-dark min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500 dark:text-text-secondary">加载中...</p>
                </div>
            </div>
        )
    }

    if (!user) {
        return (
            <Suspense fallback={<ScreenFallback />}>
                <LoginPage />
            </Suspense>
        )
    }

    if (user?.isAdmin) {
        return (
            <Suspense fallback={<ScreenFallback />}>
                <div className="app-shell text-gray-900 dark:text-text-main font-display transition-colors duration-300 h-screen min-h-0 overflow-hidden antialiased md:p-5">
                    <div className="workspace-shell relative h-full min-h-0 flex flex-col md:flex-row overflow-hidden">
                        <AdminMobileHeader onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} currentSection={adminSection} />
                        <Sidebar
                            isOpen={isSidebarOpen}
                            onClose={() => setIsSidebarOpen(false)}
                            noteCount={0}
                            favoritesCount={0}
                            trashCount={0}
                            user={user}
                            onLogout={logout}
                            currentView={adminSection === 'settings' ? 'settings' : 'admin'}
                            onSwitchView={(view) => {
                                if (view === 'settings') {
                                    setAdminSection('settings')
                                } else {
                                    setAdminSection('users')
                                }
                            }}
                            folders={[]}
                            isAdminOnly={true}
                        />
                        <div className="flex flex-col flex-1 min-h-0 pb-24 md:pb-0">
                            <AdminPage
                                user={user}
                                currentSection={adminSection}
                                onSwitchSection={setAdminSection}
                                onLogout={logout}
                                onClose={() => {}}
                            />
                        </div>
                    </div>
                </div>
            </Suspense>
        )
    }

    return (
        <Suspense fallback={<ScreenFallback />}>
            <div className="app-shell text-gray-900 dark:text-text-main font-display transition-colors duration-300 h-screen min-h-0 overflow-hidden antialiased md:p-5">
                <div className="workspace-shell relative h-full min-h-0 flex flex-col md:flex-row overflow-hidden">
                    <MobileHeader onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} onSearchOpen={() => setIsSearchOpen(true)} onCreateFolder={handleCreateFolder} />

                    <Sidebar
                        isOpen={isSidebarOpen}
                        onClose={() => setIsSidebarOpen(false)}
                        noteCount={allNotesCount}
                        favoritesCount={favoritesCount}
                        trashCount={trashCount}
                        user={user}
                        onLogout={logout}
                        currentView={currentView}
                        onSwitchView={switchView}
                        folders={folders}
                    />

                    <>
                        <div className={`${activeNote ? 'hidden' : currentView === 'settings' || currentView === 'shares' || currentView === 'admin' ? 'hidden' : 'flex'} flex-col flex-1 min-h-0 md:w-full pb-0 md:pb-0`}>
                            <NoteList
                                notes={notes}
                                loading={notesLoading}
                                selectedId={selectedNote?.id || null}
                                onSelect={(note) => { setDraftNote(null); setSelectedNote(note) }}
                                onCreateNote={openDraftNote}
                                currentView={boardView}
                                onSearchOpen={() => setIsSearchOpen(true)}
                                isExpandedList
                            />
                        </div>

                        {activeNote && currentView !== 'settings' && currentView !== 'shares' && (
                            <div className="flex md:hidden flex-col flex-1 min-h-0 pb-0 md:pb-0">
                                <Editor
                                    note={activeNote}
                                    currentView={currentView}
                                    onBack={closeActiveEditor}
                                    isOverlayDrawer={false}
                                />
                            </div>
                        )}

                        <div className={`${currentView === 'settings' ? 'flex md:hidden' : 'hidden'} flex-col flex-1 min-h-0 pb-0 md:pb-0`}>
                            <SettingsPage onClose={() => switchView(lastBoardView)} isOverlayDrawer={false} />
                        </div>

                        {currentView === 'settings' && (
                            <div data-settings-desktop="inline-page" className="hidden md:flex flex-col flex-1 min-h-0 pb-0 md:pb-0">
                                <SettingsPage onClose={() => switchView(lastBoardView)} isOverlayDrawer={false} />
                            </div>
                        )}

                        <div className={`${currentView === 'shares' ? 'flex md:hidden' : 'hidden'} flex-col flex-1 min-h-0 pb-0 md:pb-0`}>
                            <ShareLinksPage onClose={() => switchView(lastBoardView)} isOverlayDrawer={false} />
                        </div>

                        {currentView === 'shares' && (
                            <div data-share-links-desktop="inline-page" className="hidden md:flex flex-col flex-1 min-h-0 pb-0 md:pb-0">
                                <ShareLinksPage onClose={() => switchView(lastBoardView)} isOverlayDrawer={false} />
                            </div>
                        )}

                        {activeNote && currentView !== 'settings' && currentView !== 'shares' && (
                            <div data-note-detail-desktop="inline-canvas" className="hidden md:flex flex-col flex-1 min-h-0 pb-0 md:pb-0">
                                <Editor
                                    note={activeNote}
                                    currentView={currentView}
                                    onBack={closeActiveEditor}
                                    isOverlayDrawer
                                />
                            </div>
                        )}

                        <MobileDock
                            hidden={!!activeNote || isSidebarOpen || currentView === 'settings' || currentView === 'shares' || currentView === 'admin'}
                            onCreateNote={openDraftNote}
                        />
                    </>
                </div>
            </div>

            <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
        </Suspense>
    )
}

function App() {
    const path = window.location.pathname || ''
    const isSharePage = path.startsWith('/share/')
    const shareToken = isSharePage ? path.replace('/share/', '').split('/')[0] : ''

    if (isSharePage) {
        return (
            <Suspense fallback={<ScreenFallback />}>
                <SharedNotePage token={shareToken} />
            </Suspense>
        )
    }

    return (
        <ToastProvider>
            <MainContent />
        </ToastProvider>
    )
}

export default App
