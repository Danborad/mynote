import { useEffect, useState } from 'react'
import { notesApi } from '../api'
import { useToast } from '../contexts/ToastContext'
import { useNotes } from '../contexts/NotesContext'
import NotePreviewCard from './NotePreviewCard'

export default function ShareLinksPage({ isOverlayDrawer = false, onClose }) {
    const { showToast } = useToast()
    const { notes } = useNotes()
    const [links, setLinks] = useState([])
    const [loading, setLoading] = useState(false)

    const loadLinks = async () => {
        setLoading(true)
        try {
            const data = await notesApi.getSharedLinks()
            setLinks(Array.isArray(data) ? data : [])
        } catch (error) {
            showToast('加载分享链接失败: ' + error.message, 'error')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadLinks()
    }, [])

    const copyLink = async (url) => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(url)
            } else {
                const ta = document.createElement('textarea')
                ta.value = url
                document.body.appendChild(ta)
                ta.select()
                document.execCommand('copy')
                document.body.removeChild(ta)
            }
            showToast('链接已复制', 'success')
        } catch (error) {
            showToast('复制失败: ' + error.message, 'error')
        }
    }

    const revoke = async (id) => {
        try {
            await notesApi.revokeShareLink(id)
            showToast('已关闭该链接分享', 'success')
            loadLinks()
        } catch (error) {
            showToast('关闭失败: ' + error.message, 'error')
        }
    }

    const formatExpiresAt = (value) => value ? new Date(value).toLocaleString('zh-CN') : '-'
    const pageSurfaceClass = 'border border-[#dce4ee] dark:border-[#283445] bg-white dark:bg-[#111925] shadow-[0_10px_26px_rgba(27,42,63,0.05)] dark:shadow-[0_18px_36px_rgba(2,6,14,0.28)]'
    const actionButtonClass = 'h-[34px] min-w-[52px] rounded-xl px-3 text-[12px] font-extrabold transition-colors'

    return (
        <div
            data-share-links-page={isOverlayDrawer ? undefined : 'inline'}
            className={`editor-stage flex-1 ${isOverlayDrawer ? 'overlay-stage-reset h-full min-h-0 overflow-hidden bg-transparent md:p-0' : 'h-full min-h-0 flex flex-col overflow-hidden bg-[#f6f7f9] dark:bg-[#0f1722] px-3 pt-2 pb-4 md:pl-[72px] md:pr-[52px] md:pt-[38px] md:pb-11'}`}
        >
            <div className={`${isOverlayDrawer ? 'h-full min-h-0 overflow-y-auto no-scrollbar px-1 md:px-0 pt-2 md:pt-1 pr-1 md:pr-1.5' : 'mr-auto h-full min-h-0 w-full max-w-[720px] overflow-y-auto no-scrollbar md:max-w-[1042px]'}`}>
                {!isOverlayDrawer && (
                    <div data-share-links-content="desktop-v2" className="hidden md:block w-full max-w-[1042px]">
                        <header className="mb-[26px] flex h-[46px] items-center gap-3">
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#dce4ee] bg-white text-[#536174] dark:border-[#283445] dark:bg-[#111925] dark:text-[#9fb0c7]">
                                <span className="material-icons-outlined text-[18px] leading-none">link</span>
                            </span>
                            <h1 className="text-[22px] font-extrabold leading-none text-[#111827] dark:text-white">分享链接管理</h1>
                        </header>

                        <section>
                            {loading ? (
                                <div className={`${pageSurfaceClass} rounded-[18px] p-4 text-sm text-[#6c7788] dark:text-[#8ea0b7]`}>加载中...</div>
                            ) : links.length === 0 ? (
                                <div className={`${pageSurfaceClass} rounded-[18px] p-4 text-sm text-[#6c7788] dark:text-[#8ea0b7]`}>暂无分享链接</div>
                            ) : (
                                <div className="grid gap-2.5">
                                    {links.map((item) => {
                                        const linkedNote = notes.find((note) => note.id === item.id)
                                        const previewSource = linkedNote || item
                                        return (
                                            <article
                                                key={item.id}
                                                data-share-link-row
                                                className={`${pageSurfaceClass} grid min-h-[108px] grid-cols-[72px_minmax(0,1.1fr)_minmax(220px,0.8fr)_92px_126px] items-center gap-4 rounded-[18px] px-4 py-3.5`}
                                            >
                                                <div className="h-20 w-[72px] flex-shrink-0 overflow-hidden rounded-lg bg-[#162238]">
                                                    <div className="h-[168px] w-[148px] origin-top-left scale-[0.49]">
                                                        <NotePreviewCard note={previewSource} />
                                                    </div>
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="truncate text-[15px] font-extrabold text-[#111827] dark:text-white">{item.title || '无标题笔记'}</div>
                                                    <div className="mt-1.5 truncate text-[12px] text-[#6c7788] dark:text-[#8ea0b7]">到期：{formatExpiresAt(item.expiresAt)}</div>
                                                </div>
                                                <div className="flex h-[38px] min-w-0 items-center gap-2 overflow-hidden rounded-xl bg-[#f6f8fb] px-3 text-[12px] text-[#667386] dark:bg-[#0f1722] dark:text-[#8ea0b7]">
                                                    <span className="material-icons-outlined text-[16px] leading-none text-[#7b8797] dark:text-[#8ea0b7]">link</span>
                                                    <span className="truncate">{item.shareUrl}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-[12px] font-bold text-[#536174] dark:text-[#9fb0c7]">
                                                    <span className={`h-2 w-2 rounded-full ${item.expired ? 'bg-[#a8b2c0]' : 'bg-[#20bf6b]'}`} />
                                                    <span>{item.expired ? '已过期' : '生效中'}</span>
                                                </div>
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => copyLink(item.shareUrl)} className={`${actionButtonClass} bg-[#1568ff] text-white shadow-[0_8px_18px_rgba(21,104,255,0.16)] hover:bg-[#0f5de8]`}>复制</button>
                                                    <button onClick={() => revoke(item.id)} className={`${actionButtonClass} border border-[#ffc8cd] bg-white text-[#ff4a55] hover:bg-[#fff4f5] dark:bg-[#111925] dark:hover:bg-[#28171d]`}>关闭</button>
                                                </div>
                                            </article>
                                        )
                                    })}
                                </div>
                            )}
                        </section>
                    </div>
                )}

                <section className={`${isOverlayDrawer ? 'mb-5' : 'mr-auto w-full max-w-[980px] pb-8 md:hidden'}`}>
                    {loading ? (
                        <div className="surface-card bg-[#ffffff] dark:bg-[#111925] rounded-xl p-4 text-sm text-gray-500 dark:text-slate-300 border border-[#e7edf5] dark:border-[#283445]">加载中...</div>
                    ) : links.length === 0 ? (
                        <div className="surface-card bg-[#ffffff] dark:bg-[#111925] rounded-xl p-4 text-sm text-gray-500 dark:text-slate-300 border border-[#e7edf5] dark:border-[#283445]">暂无分享链接</div>
                    ) : (
                        <div className="space-y-2">
                            {links.map((item) => {
                                const linkedNote = notes.find((note) => note.id === item.id)
                                const previewSource = linkedNote || item
                                return (
                                <div key={item.id} className="surface-card bg-[#ffffff] dark:bg-[#111925] rounded-xl p-4 border border-[#e7edf5] dark:border-[#283445]">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1 flex items-start gap-3">
                                            <div className="w-[74px] h-[84px] overflow-hidden flex-shrink-0">
                                                <div className="w-[148px] h-[168px] origin-top-left scale-50">
                                                    <NotePreviewCard note={previewSource} />
                                                </div>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.title}</p>
                                                <p className="text-xs text-gray-500 dark:text-text-secondary mt-1 break-all">{item.shareUrl}</p>
                                                <p className="text-[11px] text-gray-400 dark:text-slate-400 mt-1">
                                                    {item.expired ? '已过期' : '生效中'} · 到期：{item.expiresAt ? new Date(item.expiresAt).toLocaleString('zh-CN') : '-'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <button onClick={() => copyLink(item.shareUrl)} className="h-8 px-3 rounded-lg text-xs font-medium bg-[#0a66ff] text-white hover:bg-[#005eea] shadow-sm">复制</button>
                                            <button onClick={() => revoke(item.id)} className="h-8 px-3 rounded-lg text-xs font-medium border border-red-200 dark:border-red-900/40 text-red-500 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30">关闭</button>
                                        </div>
                                    </div>
                                </div>
                            )})}
                        </div>
                    )}
                </section>
            </div>
        </div>
    )
}
