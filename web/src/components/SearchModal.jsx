import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { notesApi } from '../api'
import { useNotes } from '../contexts/NotesContext'

// 高亮关键词
function HighlightText({ text, query }) {
    if (!query || !text) return <span>{text}</span>
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
    return (
        <span>
            {parts.map((part, i) =>
                part.toLowerCase() === query.toLowerCase()
                    ? <mark key={i} className="bg-amber-200 dark:bg-amber-500/40 text-amber-900 dark:text-amber-200 rounded px-0.5">{part}</mark>
                    : <span key={i}>{part}</span>
            )}
        </span>
    )
}

// 从 HTML 提取纯文本
function extractText(html) {
    if (!html) return ''
    const div = document.createElement('div')
    div.innerHTML = html
    return div.textContent || div.innerText || ''
}

export default function SearchModal({ isOpen, onClose }) {
    const { setSelectedNote, switchView } = useNotes()
    const [query, setQuery] = useState('')
    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(false)
    const [activeIndex, setActiveIndex] = useState(0)
    const inputRef = useRef(null)
    const timerRef = useRef(null)

    // 打开时聚焦、清空
    useEffect(() => {
        if (isOpen) {
            setQuery('')
            setResults([])
            setActiveIndex(0)
            setTimeout(() => inputRef.current?.focus(), 50)
        }
    }, [isOpen])

    // 防抖搜索
    const doSearch = useCallback((q) => {
        clearTimeout(timerRef.current)
        if (!q.trim()) {
            setResults([])
            setLoading(false)
            return
        }
        setLoading(true)
        timerRef.current = setTimeout(async () => {
            try {
                const data = await notesApi.search(q)
                setResults(data)
                setActiveIndex(0)
            } catch {
                setResults([])
            } finally {
                setLoading(false)
            }
        }, 300)
    }, [])

    const handleQueryChange = (e) => {
        const val = e.target.value
        setQuery(val)
        doSearch(val)
    }

    // 选中一条结果
    const handleSelect = (note) => {
        // 切换到 all 视图確保筆記可見
        switchView('all')
        setSelectedNote(note)
        onClose()
    }

    // 键盘导航
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            onClose()
        } else if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActiveIndex(i => Math.min(i + 1, results.length - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActiveIndex(i => Math.max(i - 1, 0))
        } else if (e.key === 'Enter' && results[activeIndex]) {
            handleSelect(results[activeIndex])
        }
    }

    const formatDate = (dateStr) => {
        const d = new Date(dateStr)
        return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', year: 'numeric' })
    }

    if (!isOpen) return null

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh] px-4"
            onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
            {/* 背景遮罩 */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

            {/* 搜索面板 */}
            <div className="relative w-full max-w-xl bg-white dark:bg-surface-dark rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-border-dark flex flex-col max-h-[70vh]">
                {/* 搜索输入框 */}
                <div className="flex items-center px-4 py-3 border-b border-gray-100 dark:border-border-dark gap-3">
                    {loading
                        ? <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />
                        : <span className="material-icons-outlined text-gray-400 dark:text-text-muted text-xl flex-shrink-0">search</span>
                    }
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={handleQueryChange}
                        onKeyDown={handleKeyDown}
                        placeholder="搜索笔记标题或内容..."
                        className="flex-1 bg-transparent outline-none text-gray-900 dark:text-text-main placeholder-gray-400 dark:placeholder-text-muted text-base"
                    />
                    {query && (
                        <button
                            onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus() }}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-text-main transition-colors flex-shrink-0"
                        >
                            <span className="material-icons-outlined text-lg">close</span>
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-text-main dark:hover:bg-white/8 transition-all flex-shrink-0"
                        title="关闭"
                    >
                        <span className="material-icons-outlined text-[18px] leading-none">close</span>
                    </button>
                </div>

                {/* 结果列表 */}
                <div className="overflow-y-auto flex-1">
                    {query && !loading && results.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-14 text-gray-400 dark:text-text-muted">
                            <span className="material-icons-outlined text-4xl mb-2">search_off</span>
                            <p className="text-sm">没有找到"<span className="text-gray-600 dark:text-text-secondary">{query}</span>"相关的笔记</p>
                        </div>
                    )}

                    {!query && (
                        <div className="flex flex-col items-center justify-center py-14 text-gray-400 dark:text-text-muted">
                            <span className="material-icons-outlined text-4xl mb-2">manage_search</span>
                            <p className="text-sm">输入关键词搜索笔记</p>
                        </div>
                    )}

                    {results.length > 0 && (
                        <ul className="py-2">
                            {results.map((note, index) => {
                                const plainText = extractText(note.content)
                                // 找到关键词在内容中的位置
                                const lowerText = plainText.toLowerCase()
                                const lowerQuery = query.toLowerCase()
                                const matchIdx = lowerText.indexOf(lowerQuery)
                                let snippet = ''
                                if (matchIdx !== -1) {
                                    const start = Math.max(0, matchIdx - 30)
                                    const end = Math.min(plainText.length, matchIdx + query.length + 70)
                                    snippet = (start > 0 ? '...' : '') + plainText.slice(start, end) + (end < plainText.length ? '...' : '')
                                } else {
                                    snippet = plainText.slice(0, 100) + (plainText.length > 100 ? '...' : '')
                                }

                                const titleText = note.title || extractText(note.content).split('\n')[0] || '新建笔记'

                                return (
                                    <li
                                        key={note.id}
                                        onMouseEnter={() => setActiveIndex(index)}
                                        onClick={() => handleSelect(note)}
                                        className={`px-4 py-3 cursor-pointer transition-colors flex gap-3 items-start ${activeIndex === index
                                            ? 'bg-primary/8 dark:bg-primary/10'
                                            : 'hover:bg-gray-50 dark:hover:bg-card-dark'
                                            }`}
                                    >
                                        {/* 图标 */}
                                        <span className={`material-icons-outlined mt-0.5 text-lg flex-shrink-0 ${activeIndex === index ? 'text-primary' : 'text-gray-400 dark:text-text-muted'
                                            }`}>
                                            {note.isFavorite ? 'favorite' : 'description'}
                                        </span>

                                        <div className="flex-1 min-w-0">
                                            {/* 标题 */}
                                            <p className="font-medium text-sm text-gray-900 dark:text-text-main truncate">
                                                <HighlightText text={titleText} query={query} />
                                            </p>
                                            {/* 内容片段 */}
                                            {snippet && (
                                                <p className="text-xs text-gray-500 dark:text-text-muted mt-0.5 line-clamp-2 leading-relaxed">
                                                    <HighlightText text={snippet} query={query} />
                                                </p>
                                            )}
                                        </div>

                                        {/* 时间 */}
                                        <span className="text-xs text-gray-400 dark:text-text-muted flex-shrink-0 mt-0.5">
                                            {formatDate(note.updatedAt)}
                                        </span>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>

                {/* 底部提示 */}
                {results.length > 0 && (
                    <div className="px-4 py-2 border-t border-gray-100 dark:border-border-dark flex items-center gap-4 text-xs text-gray-400 dark:text-text-muted">
                        <span className="flex items-center gap-1">
                            <kbd className="border border-gray-200 dark:border-gray-600 rounded px-1 py-0.5">↑↓</kbd>
                            导航
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="border border-gray-200 dark:border-gray-600 rounded px-1 py-0.5">Enter</kbd>
                            打开
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="border border-gray-200 dark:border-gray-600 rounded px-1 py-0.5">Esc</kbd>
                            关闭
                        </span>
                        <span className="ml-auto">{results.length} 条结果</span>
                    </div>
                )}
            </div>
        </div>,
        document.body
    )
}
