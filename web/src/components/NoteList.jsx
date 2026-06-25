import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNotes } from '../contexts/NotesContext'
import { useToast } from '../contexts/ToastContext'
import { useConfirm, usePrompt } from './ConfirmModal'
import { computeFloatingMenuPosition } from '../utils/noteMenuPosition.js'
import { notesApi } from '../api'
import { NOTE_COLORS } from '../utils/noteColorBehavior.js'
import { lockBodyScroll } from '../utils/bodyScrollLock'
import { extractPreviewData, deriveDisplayTitle, buildPreviewText, stripHtml, getCardBackgroundFromColor } from '../utils/noteCardPreview'
import NotePreviewCard from './NotePreviewCard'

function getFolderLabel(note, folders) {
  if (!note.folderId) return ''
  return folders?.find((folder) => folder.id === note.folderId)?.name || ''
}

const NOTE_CARD_FALLBACK_LABELS = {
  image: '图片笔记',
  audio: '音频笔记',
  video: '视频笔记',
}

const DESKTOP_NOTE_CARD_LAYOUT = {
  boardGrid: 'grid grid-cols-2 gap-1.5 auto-rows-fr w-full expanded-note-board',
  compactCard: 'h-[120px]',
  mediaOffset: "hasMediaHeader ? 'pt-[82px]' : 'pt-[40px] md:pt-[37px]'",
  mediaHeader: 'h-[76px] overflow-hidden',
  contentPadding: 'px-3 pb-1.5',
  cardRadius: 'rounded-[14px]',
  titleLeading: 'leading-[1.28]',
  audioBand: 'desktop-note-card-audioBand',
  videoBand: 'desktop-note-card-videoBand',
  quietBadge: 'bg-white/12',
  mediaCaption: 'text-[9px] leading-[1.3]',
}

function buildNoteListPreviewText(preview, displayTitle) {
  const normalized = String(preview.text || '').trim()
  if (displayTitle && normalized.startsWith(displayTitle)) {
    return normalized.slice(displayTitle.length).trim()
  }
  return buildPreviewText(preview, displayTitle)
}

function NoteCard({ note, selected, folderLabel, onOpen, onMenuOpen, isSelectionMode, toggleNoteSelection, consumeLongPressClick, noteMenuButtonRefs }) {
  const selectionRingClass = selected ? 'ring-2 ring-[#7fb5ff] border-[#7fb5ff]' : ''
  const preview = extractPreviewData(note.content)
  const displayTitle = deriveDisplayTitle(note, preview)
    || (preview.image ? NOTE_CARD_FALLBACK_LABELS.image : '')
    || (preview.audio ? NOTE_CARD_FALLBACK_LABELS.audio : '')
    || (preview.video ? NOTE_CARD_FALLBACK_LABELS.video : '')
  const previewText = buildNoteListPreviewText(preview, displayTitle)
  const cardTitle = [displayTitle, previewText].filter(Boolean).join(' - ')

  return (
    <div
      className="expanded-note-card relative cursor-pointer transition-all duration-200"
      title={cardTitle}
      data-layout-markers={`${DESKTOP_NOTE_CARD_LAYOUT.mediaOffset} ${DESKTOP_NOTE_CARD_LAYOUT.mediaHeader} ${DESKTOP_NOTE_CARD_LAYOUT.contentPadding} ${DESKTOP_NOTE_CARD_LAYOUT.cardRadius} ${DESKTOP_NOTE_CARD_LAYOUT.titleLeading} ${DESKTOP_NOTE_CARD_LAYOUT.audioBand} ${DESKTOP_NOTE_CARD_LAYOUT.videoBand} ${DESKTOP_NOTE_CARD_LAYOUT.quietBadge} ${DESKTOP_NOTE_CARD_LAYOUT.mediaCaption}`}
      onClick={() => {
        if (isSelectionMode) {
          if (consumeLongPressClick(note.id)) return
          toggleNoteSelection(note.id)
          return
        }
        onOpen(note)
      }}
    >
      {isSelectionMode && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            if (consumeLongPressClick(note.id)) return
            toggleNoteSelection(note.id)
          }}
          className={`absolute top-2 left-2 z-20 w-5 h-5 rounded-full border flex items-center justify-center ${selected ? 'bg-[#2563eb] border-[#2563eb] text-white' : 'bg-white border-[#d6deea] text-transparent md:bg-white/90 md:border-white/60'}`}
        >
          <span className="material-icons-outlined text-[12px]">check</span>
        </button>
      )}

      <div className="h-[132px] md:h-full" data-desktop-card-height={DESKTOP_NOTE_CARD_LAYOUT.compactCard}>
        <NotePreviewCard note={note} menuButtonRef={(node) => { noteMenuButtonRefs.current[note.id] = node }} onMenuOpen={(e) => {
          if (isSelectionMode) return
          onMenuOpen(note.id, e.currentTarget)
        }} />
      </div>
    </div>
  )
}

export default function NoteList({ notes, loading, selectedId, onSelect, onCreateNote, currentView, onSearchOpen }) {
  const {
    folders,
    currentFolderId,
    switchView,
    createFolder,
    deleteFolder,
    emptyTrash,
    deleteNote,
    permanentDeleteNote,
    moveNoteToFolder,
    toggleFavorite,
    togglePin,
    setNoteColor,
  } = useNotes()
  const { showToast } = useToast()
  const { confirm: showConfirm, ConfirmDialog } = useConfirm()
  const { prompt, PromptDialog } = usePrompt()

  const [folderMenuOpen, setFolderMenuOpen] = useState(null)
  const [folderMenuStyle, setFolderMenuStyle] = useState(null)
  const [noteMenuOpen, setNoteMenuOpen] = useState(null)
  const [noteMenuStyle, setNoteMenuStyle] = useState(null)
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedNoteIds, setSelectedNoteIds] = useState([])
  const [batchFolderMenuOpen, setBatchFolderMenuOpen] = useState(false)
  const [batchFolderMenuStyle, setBatchFolderMenuStyle] = useState(null)
  const [batchFolderName, setBatchFolderName] = useState('')
  const [showBatchFolderInput, setShowBatchFolderInput] = useState(false)
  const [colorMenuNoteId, setColorMenuNoteId] = useState(null)

  const folderMenuRef = useRef(null)
  const folderMenuButtonRefs = useRef({})
  const noteMenuRef = useRef(null)
  const noteMenuButtonRefs = useRef({})
  const batchFolderMenuRef = useRef(null)
  const batchFolderMenuButtonRef = useRef(null)
  const longPressTimerRef = useRef(null)
  const longPressTriggeredRef = useRef(false)
  const longPressSelectionNoteIdRef = useRef(null)
  const customColorInputRef = useRef(null)
  const [previewImage, setPreviewImage] = useState(null)
  const [previewBlob, setPreviewBlob] = useState(null)

  useEffect(() => {
    if (!previewImage) return undefined
    return lockBodyScroll()
  }, [previewImage])

  const clearPreview = () => {
    if (previewImage?.startsWith('blob:')) {
      URL.revokeObjectURL(previewImage)
    }
    setPreviewImage(null)
    setPreviewBlob(null)
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (folderMenuOpen && folderMenuRef.current && !folderMenuRef.current.contains(event.target)) {
        const folderButton = folderMenuButtonRefs.current[folderMenuOpen]
        if (folderButton && folderButton.contains(event.target)) return
        setFolderMenuOpen(null)
      }

      if (noteMenuOpen && noteMenuRef.current && !noteMenuRef.current.contains(event.target)) {
        const noteButton = noteMenuButtonRefs.current[noteMenuOpen]
        if (noteButton && noteButton.contains(event.target)) return
        setNoteMenuOpen(null)
      }

      if (batchFolderMenuOpen && batchFolderMenuRef.current && !batchFolderMenuRef.current.contains(event.target)) {
        const batchButton = batchFolderMenuButtonRef.current
        if (batchButton && batchButton.contains(event.target)) return
        setBatchFolderMenuOpen(false)
        setShowBatchFolderInput(false)
      }

      if (colorMenuNoteId) {
        setColorMenuNoteId(null)
        setShowCustomColorEditor(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [folderMenuOpen, noteMenuOpen, batchFolderMenuOpen])

  useEffect(() => {
    if (isSelectionMode && selectedNoteIds.length === 0) {
      clearSelectionMode()
    }
  }, [isSelectionMode, selectedNoteIds.length])

  useLayoutEffect(() => {
    if (!folderMenuOpen) {
      setFolderMenuStyle(null)
      return undefined
    }
    const updatePosition = () => {
      const anchor = folderMenuButtonRefs.current[folderMenuOpen]
      const menu = folderMenuRef.current
      if (!anchor || !menu) return
      const next = computeFloatingMenuPosition(anchor.getBoundingClientRect(), { width: menu.offsetWidth || 160, height: menu.offsetHeight || 160 }, { width: window.innerWidth, height: window.innerHeight })
      setFolderMenuStyle({ top: `${next.top}px`, left: `${next.left}px`, maxHeight: `${next.maxHeight}px` })
    }
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [folderMenuOpen, folders?.length])

  useLayoutEffect(() => {
    if (!noteMenuOpen) {
      setNoteMenuStyle(null)
      return undefined
    }
    const updatePosition = () => {
      const anchor = noteMenuButtonRefs.current[noteMenuOpen]
      const menu = noteMenuRef.current
      if (!anchor || !menu) return
      const next = computeFloatingMenuPosition(anchor.getBoundingClientRect(), { width: menu.offsetWidth || 190, height: menu.offsetHeight || 220 }, { width: window.innerWidth, height: window.innerHeight })
      setNoteMenuStyle({ top: `${next.top}px`, left: `${next.left}px`, maxHeight: `${next.maxHeight}px` })
    }
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [noteMenuOpen, notes.length, folders?.length])

  useLayoutEffect(() => {
    if (!batchFolderMenuOpen) {
      setBatchFolderMenuStyle(null)
      return undefined
    }
    const updatePosition = () => {
      const anchor = batchFolderMenuButtonRef.current
      const menu = batchFolderMenuRef.current
      if (!anchor || !menu) return
      const next = computeFloatingMenuPosition(anchor.getBoundingClientRect(), { width: menu.offsetWidth || 190, height: menu.offsetHeight || 260 }, { width: window.innerWidth, height: window.innerHeight })
      setBatchFolderMenuStyle({ top: `${next.top}px`, left: `${next.left}px`, maxHeight: `${next.maxHeight}px` })
    }
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [batchFolderMenuOpen, showBatchFolderInput, folders?.length])

  const visibleNotes = useMemo(() => notes || [], [notes])

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const clearSelectionMode = () => {
    setIsSelectionMode(false)
    setSelectedNoteIds([])
    setBatchFolderMenuOpen(false)
    setShowBatchFolderInput(false)
    setBatchFolderName('')
    longPressTriggeredRef.current = false
    longPressSelectionNoteIdRef.current = null
  }

  const enterSelectionMode = (noteId) => {
    setIsSelectionMode(true)
    setNoteMenuOpen(null)
    setBatchFolderMenuOpen(false)
    setSelectedNoteIds((prev) => (prev.includes(noteId) ? prev : [...prev, noteId]))
  }

  const toggleNoteSelection = (noteId) => {
    setSelectedNoteIds((prev) => prev.includes(noteId) ? prev.filter((id) => id !== noteId) : [...prev, noteId])
  }

  const consumeLongPressClick = (noteId) => {
    if (longPressSelectionNoteIdRef.current !== noteId) return false
    longPressSelectionNoteIdRef.current = null
    return true
  }

  const handleNotePointerDown = (noteId) => {
    clearLongPressTimer()
    longPressTriggeredRef.current = false
    longPressSelectionNoteIdRef.current = null
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true
      longPressSelectionNoteIdRef.current = noteId
      enterSelectionMode(noteId)
    }, 450)
  }

  const handleNotePointerUp = () => {
    clearLongPressTimer()
  }

  const handleDeleteFolder = async (id) => {
    const isConfirmed = await showConfirm({
      title: '删除分组',
      message: '确定要删除此分组吗？分组内的笔记将移至未分类。',
      confirmText: '确定删除',
      danger: true,
    })
    if (!isConfirmed) return
    await deleteFolder(id)
    setFolderMenuOpen(null)
    showToast('已删除分组', 'success')
  }

  const handleEmptyTrash = async () => {
    const isConfirmed = await showConfirm({
      title: '清空废纸篓',
      message: '确定要清空废纸篓吗？此操作不可恢复。',
      confirmText: '清空',
      danger: true,
    })
    if (!isConfirmed) return
    await emptyTrash()
    showToast('废纸篓已清空', 'success')
  }

  const handleDeleteNote = async (noteId) => {
    await deleteNote(noteId)
    setNoteMenuOpen(null)
    showToast('已移入废纸篓', 'success')
  }

  const handlePermanentDeleteNote = async (noteId) => {
    await permanentDeleteNote(noteId)
    setNoteMenuOpen(null)
    showToast('已彻底删除', 'success')
  }

  const handleMoveToFolder = async (noteId, folderId) => {
    await moveNoteToFolder(noteId, folderId)
    setNoteMenuOpen(null)
    showToast(folderId ? '已加入分组' : '已移出分组', 'success')
  }

  const handleToggleFavorite = async (noteId) => {
    await toggleFavorite(noteId)
    setNoteMenuOpen(null)
    showToast('已更新收藏状态', 'success')
  }

  const handleSetColor = async (noteId, color) => {
    await setNoteColor(noteId, color)
    setColorMenuNoteId(null)
    setShowCustomColorEditor(false)
    setNoteMenuOpen(null)
    showToast(color ? '已更新卡片颜色' : '已恢复默认颜色', 'success')
  }

  const handleCopyText = async (note) => {
    const text = stripHtml(note.content || '')
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
    } else {
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
    setNoteMenuOpen(null)
    showToast('已复制文本', 'success')
  }

  const handleShareAsImage = async () => {
    const selected = visibleNotes.find((item) => item.id === noteMenuOpen)
    if (!selected) return
    let container
    try {
      container = document.createElement('div')
      container.style.cssText = 'position:fixed;left:-9999px;top:0;width:480px;padding:32px;background:white;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif;'
      const preview = extractPreviewData(selected.content)
      container.innerHTML = `
        <style>
          .mynote-share-render img { display: block; max-width: 100%; height: auto; border-radius: 12px; margin: 16px 0; }
          .mynote-share-render p { margin: 8px 0; }
          .mynote-share-render pre { background: #1e293b; color: #e2e8f0; padding: 16px; border-radius: 8px; margin: 16px 0; font-size: 13px; line-height: 1.6; white-space: pre-wrap; word-break: break-all; }
        </style>
        <div class="mynote-share-render" style="font-size:16px;line-height:1.8;color:#374151;">
          ${selected.content || '<p style="color:#9ca3af;">暂无内容</p>'}
        </div>
        <div style="margin-top:32px;padding-top:20px;text-align:center;border-top:1px solid #f3f4f6;">
          <div style="display:inline-flex;align-items:center;justify-content:center;opacity:0.8;">
            <span style="color:#3B82F6;font-weight:800;font-size:16px;">My</span><span style="color:#374151;font-weight:600;font-size:16px;">Note</span>
          </div>
        </div>
      `
      document.body.appendChild(container)
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(container, { backgroundColor: '#ffffff', scale: Math.min(window.devicePixelRatio || 1, 1.5), useCORS: true, logging: false, width: 480 })
      const blob = await new Promise((resolve, reject) => canvas.toBlob((b) => b ? resolve(b) : reject(new Error('无法生成图片数据')), 'image/png'))
      const imageUrl = URL.createObjectURL(blob)
      setPreviewBlob(blob)
      setPreviewImage(imageUrl)
      setNoteMenuOpen(null)
    } catch (error) {
      showToast('生成图片失败: ' + error.message, 'error')
    } finally {
      if (container?.parentNode) container.parentNode.removeChild(container)
    }
  }

  const handleExportAsMarkdown = async (note) => {
    const { default: TurndownService } = await import('turndown')
    const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' })
    const markdown = td.turndown(note.content || '')
    const title = deriveDisplayTitle(note, extractPreviewData(note.content)) || '笔记'
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.slice(0, 30)}.md`
    a.click()
    URL.revokeObjectURL(url)
    setNoteMenuOpen(null)
    showToast('已导出为 Markdown', 'success')
  }

  const handleExportAsText = (note) => {
    const title = deriveDisplayTitle(note, extractPreviewData(note.content)) || '笔记'
    const blob = new Blob([stripHtml(note.content || '')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.slice(0, 30)}.txt`
    a.click()
    URL.revokeObjectURL(url)
    setNoteMenuOpen(null)
    showToast('已导出为纯文本', 'success')
  }

  const handleCopyShareLink = async (noteId) => {
    const data = await notesApi.createShareLink(noteId)
    const link = data?.shareUrl
    if (!link) throw new Error('生成分享链接失败')
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(link)
    } else {
      const textArea = document.createElement('textarea')
      textArea.value = link
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
    setNoteMenuOpen(null)
    showToast('分享链接已复制', 'success')
  }

  const handleShareLink = async (noteId) => {
    await handleCopyShareLink(noteId)
  }

  const handleTogglePin = async (noteId) => {
    await togglePin(noteId)
    setNoteMenuOpen(null)
    showToast('已更新置顶状态', 'success')
  }

  const handleCustomColorChange = async (event) => {
    const noteId = colorMenuNoteId
    const value = event.target.value
    if (!noteId || !value) return
    await handleSetColor(noteId, value)
  }

  const handleDownloadImage = () => {
    if (!previewImage) return
    const a = document.createElement('a')
    a.href = previewImage
    a.download = `note-${Date.now()}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    clearPreview()
    showToast('图片已下载', 'success')
  }

  const handleCopyImage = async () => {
    if (!previewBlob) return
    if (navigator.clipboard && navigator.clipboard.write && window.ClipboardItem) {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': previewBlob })])
      clearPreview()
      showToast('图片已复制到剪贴板', 'success')
      return
    }
    showToast('当前浏览器不支持复制图片，请使用下载图片', 'warning')
  }

  const handleBatchMoveToFolder = async (folderId) => {
    if (selectedNoteIds.length === 0) return
    setBatchFolderMenuOpen(false)
    setShowBatchFolderInput(false)
    await Promise.all(selectedNoteIds.map((noteId) => moveNoteToFolder(noteId, folderId)))
    showToast(`已更新 ${selectedNoteIds.length} 篇笔记的分组`, 'success')
    clearSelectionMode()
  }

  const handleCreateBatchFolder = async () => {
    if (!batchFolderName.trim()) {
      showToast('分组名称不能为空', 'warning')
      return
    }
    const folder = await createFolder(batchFolderName.trim())
    setBatchFolderName('')
    await handleBatchMoveToFolder(folder.id)
    showToast(`已创建分组“${folder.name}”`, 'success')
  }

  const handleBatchDelete = async () => {
    if (selectedNoteIds.length === 0) return
    const isConfirmed = await showConfirm({
      title: currentView === 'trash' ? '批量彻底删除' : '批量删除笔记',
      message: currentView === 'trash'
        ? `确定要彻底删除这 ${selectedNoteIds.length} 篇笔记吗？删除后无法恢复。`
        : `确定要删除这 ${selectedNoteIds.length} 篇笔记吗？它们将被移入废纸篓。`,
      confirmText: currentView === 'trash' ? '彻底删除' : '删除',
      danger: true,
    })
    if (!isConfirmed) return
    if (currentView === 'trash') {
      await Promise.all(selectedNoteIds.map((noteId) => permanentDeleteNote(noteId)))
    } else {
      await Promise.all(selectedNoteIds.map((noteId) => deleteNote(noteId)))
    }
    showToast(`已处理 ${selectedNoteIds.length} 篇笔记`, 'success')
    clearSelectionMode()
  }

  return (
    <section className="flex-1 md:w-full md:flex-1 flex flex-col min-h-0 md:border-r h-full relative z-10 bg-[#f6f7f9] dark:bg-[#0f1722] md:border-[#edf1f5] md:dark:border-[#243244]">
      <div className="hidden md:flex w-full items-center justify-between gap-3 pb-3 px-3 pt-5">
        <div className="overflow-x-auto no-scrollbar">
          <div className="flex items-center space-x-2 min-w-max rounded-[24px] bg-white dark:bg-[#111925] px-3 py-2 shadow-[0_10px_22px_rgba(15,23,42,0.05)] dark:shadow-[0_18px_30px_rgba(2,6,14,0.24)] border border-[#eef2f6] dark:border-[#283445] w-fit">
            <button onClick={() => switchView('all')} className={`rounded-2xl px-3 py-1.5 text-[15px] font-medium whitespace-nowrap transition-all active:scale-95 relative ${currentView === 'all' ? 'bg-white text-[#221d1b] shadow-sm dark:bg-[#1f3043] dark:text-[#f6f1eb]' : 'text-gray-500 dark:text-[#98a2b3]'}`}>全部</button>
            {folders?.map((folder) => (
              <div key={folder.id} className="relative">
                <button
                  ref={(el) => { folderMenuButtonRefs.current[folder.id] = el }}
                  onClick={() => switchView('folder', folder.id)}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    setFolderMenuOpen(folderMenuOpen === folder.id ? null : folder.id)
                  }}
                  className={`rounded-2xl px-3 py-1.5 text-[15px] font-medium whitespace-nowrap transition-all active:scale-95 relative ${currentView === 'folder' && currentFolderId === folder.id ? 'bg-white text-[#221d1b] shadow-sm dark:bg-[#1f3043] dark:text-[#f6f1eb]' : 'text-gray-500 dark:text-[#98a2b3]'}`}
                >
                  {folder.name}
                </button>

                {folderMenuOpen === folder.id && createPortal(
                  <div ref={folderMenuRef} className="menu-panel fixed border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-[1100] py-1 min-w-[120px] overflow-y-auto" style={folderMenuStyle || { visibility: 'hidden' }}>
                    <button onClick={() => showToast('当前版本未恢复分组重命名能力', 'warning')} className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                      <span className="material-icons-outlined text-sm mr-2">edit</span>
                      重命名
                    </button>
                    <button onClick={() => handleDeleteFolder(folder.id)} className="w-full flex items-center px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                      <span className="material-icons-outlined text-sm mr-2">delete</span>
                      删除
                    </button>
                  </div>,
                  document.body,
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={async () => {
                const name = (await prompt({ title: '创建分组', placeholder: '请输入分组名称' }))?.trim()
                if (!name) return
                await createFolder(name)
              }}
              className="flex h-10 w-10 items-center justify-center rounded-2xl text-gray-500 dark:text-[#98a2b3] transition-all active:scale-95 hover:bg-[#f4f6f8] dark:hover:bg-[#162131]"
              aria-label="创建分组"
              title="创建分组"
            >
              <span className="material-icons-outlined">add</span>
            </button>
          </div>
        </div>

        {currentView === 'trash' ? (
          <button onClick={handleEmptyTrash} className="hidden md:inline-flex items-center justify-center px-4 h-10 rounded-2xl bg-red-50 text-red-600 text-sm font-medium">
            清空
          </button>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-3 pt-3 pb-0 md:px-3 md:pb-4 relative">
        <div className="hidden md:block w-full overflow-x-auto no-scrollbar pb-3 px-3 pt-5 sr-only" aria-hidden="true"></div>
        {isSelectionMode && visibleNotes.length > 0 && (
          <div className="mb-3 surface-card bg-white/94 dark:bg-[#111925] px-3 py-3 rounded-2xl border border-[#e7edf5] dark:border-[#283445]">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-gray-900 dark:text-white">已选 {selectedNoteIds.length} 项</div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button ref={batchFolderMenuButtonRef} type="button" onClick={(e) => { e.stopPropagation(); setBatchFolderMenuOpen((prev) => !prev); setShowBatchFolderInput(false) }} className="px-3 py-1.5 rounded-xl bg-[#eef4ff] text-[#2563eb] dark:bg-[#172334] dark:text-sky-300 text-sm font-medium">加入分组</button>
                  {batchFolderMenuOpen && createPortal(
                    <div ref={batchFolderMenuRef} className="fixed w-44 menu-panel border border-gray-200 dark:border-gray-600 rounded-xl p-1 z-[1200] shadow-2xl" style={batchFolderMenuStyle || { visibility: 'hidden' }}>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setShowBatchFolderInput((prev) => !prev) }} className="w-full text-left px-3 py-2 rounded-lg text-sm text-primary hover:bg-gray-100 dark:hover:bg-gray-700">批量新建分组</button>
                      {showBatchFolderInput && (
                        <div className="px-2 py-2 space-y-2">
                          <input type="text" value={batchFolderName} onChange={(e) => setBatchFolderName(e.target.value)} placeholder="分组名称" className="w-full px-3 py-2 rounded-lg text-sm bg-white dark:bg-[#111925] border border-gray-200 dark:border-gray-600 focus:outline-none" />
                          <button type="button" onClick={(e) => { e.stopPropagation(); handleCreateBatchFolder() }} className="w-full px-3 py-2 rounded-lg text-sm bg-[#2563eb] text-white font-medium">创建并加入</button>
                        </div>
                      )}
                      <button type="button" onClick={(e) => { e.stopPropagation(); handleBatchMoveToFolder(null) }} className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">移出分组</button>
                      {folders?.map((folder) => (
                        <button key={`batch-folder-${folder.id}`} type="button" onClick={(e) => { e.stopPropagation(); handleBatchMoveToFolder(folder.id) }} className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">{folder.name}</button>
                      ))}
                    </div>,
                    document.body,
                  )}
                </div>
                <button type="button" onClick={(e) => { e.stopPropagation(); handleBatchDelete() }} className="px-3 py-1.5 rounded-xl bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300 text-sm font-medium">删除</button>
                <button type="button" onClick={(e) => { e.stopPropagation(); clearSelectionMode() }} className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-600 dark:bg-[#1b2635] dark:text-gray-300 text-sm font-medium">取消</button>
              </div>
            </div>
          </div>
        )}

        {loading && visibleNotes.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-text-secondary p-4">加载中...</div>
        ) : visibleNotes.length === 0 ? (
          <div className="surface-card bg-white dark:bg-[#111925] rounded-2xl p-6 text-sm text-gray-500 dark:text-slate-300">暂无笔记</div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 auto-rows-fr w-full expanded-note-board md:gap-1.5" data-desktop-grid={DESKTOP_NOTE_CARD_LAYOUT.boardGrid}>
            {visibleNotes.map((note) => (
              <div
                key={note.id}
                className="w-full"
                onPointerDown={() => handleNotePointerDown(note.id)}
                onPointerUp={handleNotePointerUp}
                onPointerLeave={handleNotePointerUp}
                onPointerCancel={handleNotePointerUp}
              >
                <NoteCard
                  note={note}
                  selected={selectedId === note.id || selectedNoteIds.includes(note.id)}
                  folderLabel={getFolderLabel(note, folders)}
                  isSelectionMode={isSelectionMode}
                  toggleNoteSelection={toggleNoteSelection}
                  consumeLongPressClick={consumeLongPressClick}
                  noteMenuButtonRefs={noteMenuButtonRefs}
                  onOpen={(selected) => {
                    if (consumeLongPressClick(note.id)) return
                    if (longPressTriggeredRef.current) {
                      longPressTriggeredRef.current = false
                      return
                    }
                    onSelect(selected)
                  }}
                  onMenuOpen={(id) => {
                    setNoteMenuOpen(id)
                  }}
                />

                {noteMenuOpen === note.id && createPortal(
                  <div ref={noteMenuRef} className="menu-panel fixed border border-gray-200 dark:border-gray-600 rounded-[18px] shadow-[0_14px_26px_rgba(31,41,55,0.16)] z-[1100] py-1 md:py-1.5 min-w-[148px] md:min-w-[176px] overflow-y-auto no-scrollbar" style={noteMenuStyle || { visibility: 'hidden' }}>
                    {currentView !== 'trash' ? (
                      <>
                        <div className="px-2 py-0.5 text-[9px] md:px-3 md:text-[10px] font-semibold text-gray-400 dark:text-text-tertiary tracking-[0.01em]">分享</div>
                        <button onClick={() => handleToggleFavorite(note.id)} className="w-full flex items-center px-2 py-1.5 text-[12px] md:px-2.5 md:text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><span className="material-icons-outlined text-[16px] mr-2">favorite_border</span>{note.isFavorite ? '取消收藏' : '加入收藏'}</button>
                        <button onClick={() => handleCopyText(note)} className="w-full flex items-center px-2 py-1.5 text-[12px] md:px-2.5 md:text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><span className="material-icons-outlined text-[16px] mr-2">content_copy</span>复制文本</button>
                        <button onClick={handleShareAsImage} className="w-full flex items-center px-2 py-1.5 text-[12px] md:px-2.5 md:text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><span className="material-icons-outlined text-[16px] mr-2">image</span>图片分享</button>
                        <button onClick={() => handleShareLink(note.id)} className="w-full flex items-center px-2 py-1.5 text-[12px] md:px-2.5 md:text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><span className="material-icons-outlined text-[16px] mr-2">link</span>链接分享</button>
                        <div className="px-2 py-0.5 text-[9px] md:px-3 md:text-[10px] font-semibold text-gray-400 dark:text-text-tertiary tracking-[0.01em]">移动分组</div>
                        <button onClick={() => handleMoveToFolder(note.id, null)} className={`w-full flex items-center px-2 py-1.5 text-[12px] md:px-2.5 md:text-[13px] hover:bg-gray-100 dark:hover:bg-gray-700 ${!note.folderId ? 'text-[#2563eb]' : 'text-gray-700 dark:text-gray-300'}`}><span className="material-icons-outlined text-[16px] mr-2">folder_off</span>未分组{!note.folderId ? <span className="material-icons-outlined text-[12px] md:text-[13px] ml-auto">check</span> : null}</button>
                        {folders?.map((folder) => (
                          <button key={`note-folder-${folder.id}`} onClick={() => handleMoveToFolder(note.id, folder.id)} className={`w-full flex items-center px-2 py-1.5 text-[12px] md:px-2.5 md:text-[13px] hover:bg-gray-100 dark:hover:bg-gray-700 ${note.folderId === folder.id ? 'text-[#2563eb]' : 'text-gray-700 dark:text-gray-300'}`}><span className="material-icons-outlined text-[16px] mr-2">folder</span>{folder.name}{note.folderId === folder.id ? <span className="material-icons-outlined text-[12px] md:text-[13px] ml-auto">check</span> : null}</button>
                        ))}
                        <div className="h-px bg-gray-100 dark:bg-gray-700 my-1.5"></div>
                        <div className="px-2 py-0.5 text-[9px] md:px-3 md:text-[10px] font-semibold text-gray-400 dark:text-text-tertiary tracking-[0.01em]">导出</div>
                        <button onClick={() => handleExportAsMarkdown(note)} className="w-full flex items-center px-2 py-1.5 text-[12px] md:px-2.5 md:text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><span className="material-icons-outlined text-[16px] mr-2">description</span>导出 Markdown</button>
                        <button onClick={() => handleExportAsText(note)} className="w-full flex items-center px-2 py-1.5 text-[12px] md:px-2.5 md:text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><span className="material-icons-outlined text-[16px] mr-2">text_snippet</span>导出纯文本</button>
                        <div className="h-px bg-gray-100 dark:bg-gray-700 my-1.5"></div>
                        <div className="px-2 py-0.5 text-[9px] md:px-3 md:text-[10px] font-semibold text-gray-400 dark:text-text-tertiary tracking-[0.01em]">管理</div>
                        <button onClick={() => handleTogglePin(note.id)} className="w-full flex items-center px-2 py-1.5 text-[12px] md:px-2.5 md:text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><span className="material-icons-outlined text-[16px] mr-2">push_pin</span>{note.isPinned ? '取消置顶' : '置顶'}</button>
                        <div className="h-px bg-gray-100 dark:bg-gray-700 my-1.5"></div>
                        <div className="px-2 py-0.5 text-[9px] md:px-3 md:text-[10px] font-semibold text-gray-400 dark:text-text-tertiary tracking-[0.01em]">渐变背景</div>
                        <div className="mx-2 md:mx-3 mt-1.5 mb-1.5">
                          <div className="flex items-center justify-between text-[10px] md:text-[11px] font-semibold text-gray-400 mb-2.5">
                            <span></span>
                            <button onClick={() => handleSetColor(note.id, null)} className="hover:text-gray-500">恢复默认</button>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {NOTE_COLORS.filter((color) => color.id !== 'reset').map((color) => (
                              <button
                                key={color.id}
                                onClick={() => handleSetColor(note.id, color.value)}
                                className={`w-5 h-5 rounded-full border ${note.color === color.value ? 'ring-2 ring-[#7fb5ff] border-white' : 'border-white/70'}`}
                                style={{ background: getCardBackgroundFromColor(color.value, color.light || '#fff') }}
                              />
                            ))}
                          </div>
                          <button onClick={() => { setColorMenuNoteId(note.id); customColorInputRef.current?.click() }} className="mt-2 w-full text-left text-[12px] md:text-[13px] text-gray-500 hover:text-gray-700">自定义颜色</button>
                          <input ref={customColorInputRef} type="color" className="sr-only" onInput={handleCustomColorChange} onChange={handleCustomColorChange} />
                        </div>
                        <button onClick={() => handleDeleteNote(note.id)} className="w-full flex items-center px-2 py-1.5 text-[12px] md:px-2.5 md:text-[13px] text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"><span className="material-icons-outlined text-[16px] mr-2">delete</span>删除笔记</button>
                      </>
                    ) : (
                      <button onClick={() => handlePermanentDeleteNote(note.id)} className="w-full flex items-center px-2 py-1.5 text-[12px] md:px-2.5 md:text-[13px] text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">彻底删除</button>
                    )}
                  </div>,
                  document.body,
                )}
              </div>
            ))}
          </div>
        )}

        {currentView !== 'trash' ? (
          <button
            onClick={onCreateNote}
            className="absolute right-6 bottom-6 z-20 hidden md:flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2563eb] text-white shadow-lg shadow-blue-500/25 hover:bg-[#1d4ed8] transition-colors"
            aria-label="创建笔记"
          >
            <span className="material-icons-outlined">add</span>
          </button>
        ) : null}
      </div>

      <ConfirmDialog />
      <PromptDialog />

      {previewImage && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={clearPreview}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden relative max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <button onClick={clearPreview} className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors z-10">
              <span className="material-icons-outlined text-lg leading-none">close</span>
            </button>
            <div className="p-4 overflow-y-auto flex-1">
              <img src={previewImage} alt="笔记图片" className="w-full rounded-xl shadow-sm" />
            </div>
            <div className="flex border-t border-gray-100 flex-shrink-0">
              <button onClick={handleDownloadImage} className="flex-1 py-3 text-gray-600 hover:bg-gray-50 transition-colors font-medium flex items-center justify-center gap-1.5">
                <span className="material-icons-outlined text-lg leading-none">download</span>
                下载图片
              </button>
              <button onClick={handleCopyImage} className="flex-1 py-3 text-primary hover:bg-blue-50 transition-colors font-medium border-l border-gray-100 flex items-center justify-center gap-1.5">
                <span className="material-icons-outlined text-lg leading-none">content_copy</span>
                复制到剪贴板
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </section>
  )
}
