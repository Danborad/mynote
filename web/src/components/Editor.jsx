import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNotes } from '../contexts/NotesContext'
import EditorToolbar from './EditorToolbar'
import TipTapEditor from './TipTapEditor'
import { useConfirm } from './ConfirmModal'
import { getToken, apiUrl, toAbsoluteUrl, isSyncModeEnabled, notesApi } from '../api'
import { useToast } from '../contexts/ToastContext' // Added import for useToast
import { lockBodyScroll } from '../utils/bodyScrollLock'

export default function Editor({ note, currentView, onBack, isOverlayDrawer = false }) {
    const { notes, setSelectedNote, createNote, updateNote, deleteNote, toggleFavorite, restoreNote, permanentDeleteNote, folders, moveNoteToFolder, togglePin } = useNotes()
    const { confirm, ConfirmDialog } = useConfirm()
    const { showToast } = useToast() // Added useToast hook
    const [content, setContent] = useState('')
    const [saving, setSaving] = useState(false)
    const [lastSaved, setLastSaved] = useState(null)
    const [showFolderMenu, setShowFolderMenu] = useState(false)
    const [showShareMenu, setShowShareMenu] = useState(false)
    const [shareMessage, setShareMessage] = useState('')
    const [shareInfo, setShareInfo] = useState({ enabled: false, shareUrl: null, sharedAt: null })
    const [uploadState, setUploadState] = useState({ active: false, progress: 0, fileName: '', processing: false })
    const [previewImage, setPreviewImage] = useState(null)
    const [previewBlob, setPreviewBlob] = useState(null)
    const editorRef = useRef(null)
    const fileInputRef = useRef(null)
    const folderMenuRef = useRef(null)
    const shareMenuRef = useRef(null)
    const mobileShareMenuRef = useRef(null)
    const mobileFolderMenuRef = useRef(null)
    const noteContentRef = useRef(null)
    const draftCreationRef = useRef(false)

    const isDraftNote = !note?.id

    const handleCreateDraft = () => {
        onBack?.()
    }

    const htmlToPlainText = (html = '') => {
        const normalizedHtml = html
            .replace(/<\s*br\s*\/?>/gi, '\n')
            .replace(/<\s*li[^>]*>/gi, '\n- ')
            .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|pre|blockquote|section|article)>/gi, '\n')

        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = normalizedHtml

        return (tempDiv.textContent || tempDiv.innerText || '')
            .replace(/\u00a0/g, ' ')
            .replace(/\r\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim()
    }

    const extractOverviewContent = (html = '') => {
        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = html || ''
        const firstImg = tempDiv.querySelector('img')
        const image = firstImg?.getAttribute('src') ? toAbsoluteUrl(firstImg.getAttribute('src')) : null
        const text = htmlToPlainText(html)
        return {
            image,
            lines: text.split('\n').filter(Boolean),
        }
    }

    const normalizeMediaUrls = (html = '') => {
        return String(html || '').replace(/\s(src)=(["'])([^"']+)\2/gi, (match, attr, quote, url) => {
            return ` ${attr}=${quote}${toAbsoluteUrl(url)}${quote}`
        })
    }

    const toStorageMediaUrl = (value = '') => {
        const input = String(value || '')
        if (!input) return input

        return input
            .replace(/^https?:\/\/[^/]+\/api\/uploads\//i, '/uploads/')
            .replace(/^https?:\/\/[^/]+\/uploads\//i, '/uploads/')
            .replace(/^\/?api\/uploads\//i, '/uploads/')
            .replace(/^uploads\//i, '/uploads/')
    }

    const hasBlobMediaUrl = (html = '') => /\ssrc=(['"])blob:[^"']+\1/i.test(String(html || ''))

    const hasMeaningfulDraftContent = (html = '') => {
        const plainText = htmlToPlainText(html)
        return plainText.length > 0 || /<(img|audio|video|iframe|figure|pre|code|ul|ol|li|blockquote|table)\b/i.test(String(html || ''))
    }

    const pauseForPaint = () => new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve))
    })

    const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms))

    const canvasToBlob = (canvas) => new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(blob)
                return
            }
            reject(new Error('无法生成图片数据'))
        }, 'image/png')
    })

    const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(new Error('无法读取图片数据'))
        reader.readAsDataURL(blob)
    })

    const copyImageViaExecCommand = async (blob) => {
        const dataUrl = await blobToDataUrl(blob)
        const wrapper = document.createElement('div')
        wrapper.contentEditable = 'true'
        wrapper.style.position = 'fixed'
        wrapper.style.left = '-9999px'
        wrapper.style.top = '0'

        const image = document.createElement('img')
        image.src = String(dataUrl)
        wrapper.appendChild(image)
        document.body.appendChild(wrapper)

        const selection = window.getSelection()
        const range = document.createRange()
        range.selectNode(image)
        selection?.removeAllRanges()
        selection?.addRange(range)

        let copied = false
        try {
            copied = document.execCommand('copy')
        } finally {
            selection?.removeAllRanges()
            wrapper.remove()
        }

        return copied
    }

    const clearPreview = () => {
        if (previewImage?.startsWith('blob:')) {
            URL.revokeObjectURL(previewImage)
        }
        setPreviewImage(null)
        setPreviewBlob(null)
    }

    // 同步笔记数据
    useEffect(() => {
        setContent(normalizeMediaUrls(note?.content || ''))
        draftCreationRef.current = false
    }, [note?.id])

    useEffect(() => () => {
        if (previewImage?.startsWith('blob:')) {
            URL.revokeObjectURL(previewImage)
        }
    }, [previewImage])

    useEffect(() => {
        if (!previewImage) return undefined
        return lockBodyScroll()
    }, [previewImage])

    // 自动保存
    useEffect(() => {
        if (!note || currentView === 'trash' || isDraftNote) return

        const timer = setTimeout(async () => {
            // 从 HTML 内容提取纯文本第一行作为标题
            const textContent = htmlToPlainText(content)
            const firstLine = textContent.split('\n')[0].slice(0, 50).trim()
            const newTitle = firstLine || ''

            if (hasBlobMediaUrl(content)) {
                return
            }

            if (content !== note.content) {
                setSaving(true)
                try {
                    await updateNote(note.id, {
                        title: newTitle,
                        content
                    })
                    setLastSaved(new Date())
                } catch (err) {
                    console.error('保存失败:', err)
                } finally {
                    setSaving(false)
                }
            }
        }, 1000)

        return () => clearTimeout(timer)
    }, [content, note?.id])

    const uploadFile = async (file) => {
        const fileName = file?.name || '文件'
        setUploadState({ active: true, progress: 0, fileName, processing: false })

        const finishUploadState = () => {
            window.setTimeout(() => {
                setUploadState({ active: false, progress: 0, fileName: '', processing: false })
            }, 500)
        }

        if (!isSyncModeEnabled()) {
            try {
                const url = await new Promise((resolve, reject) => {
                    const reader = new FileReader()
                    reader.onload = () => resolve(reader.result)
                    reader.onerror = () => reject(new Error('本地文件读取失败'))
                    reader.readAsDataURL(file)
                })
                setUploadState((prev) => ({ ...prev, progress: 100, processing: false }))
                return { url }
            } finally {
                finishUploadState()
            }
        }

        const formData = new FormData()
        formData.append('file', file)
        const token = getToken()

        try {
            const data = await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest()
                let settled = false
                const settle = (fn, value) => {
                    if (settled) return
                    settled = true
                    fn(value)
                }
                xhr.open('POST', apiUrl('/files/upload'))
                xhr.timeout = 120000
                if (token) {
                    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
                }

                const hardTimeout = window.setTimeout(() => {
                    try {
                        xhr.abort()
                    } catch {
                        // ignore
                    }
                    settle(reject, new Error('上传超时，请稍后重试'))
                }, 30000)

                xhr.upload.onprogress = (event) => {
                    if (!event.lengthComputable) return
                    const percent = Math.min(100, Math.round((event.loaded / event.total) * 100))
                    setUploadState((prev) => ({ ...prev, progress: percent, processing: false }))
                    if (percent >= 100) {
                        window.setTimeout(() => {
                            setUploadState((prev) => {
                                if (!prev.active) return prev
                                return { active: false, progress: 0, fileName: '', processing: false }
                            })
                        }, 900)
                    }
                }

                xhr.onerror = () => settle(reject, new Error('网络异常，上传失败'))
                xhr.ontimeout = () => settle(reject, new Error('上传超时，请检查服务器状态'))
                xhr.onabort = () => settle(reject, new Error('上传已中断'))
                xhr.onload = () => {
                    if (xhr.status < 200 || xhr.status >= 300) {
                        settle(reject, new Error('上传失败，请检查服务器'))
                        return
                    }
                    try {
                        settle(resolve, JSON.parse(xhr.responseText || '{}'))
                    } catch {
                        settle(reject, new Error('上传响应解析失败'))
                    }
                }
                xhr.onloadend = () => {
                    window.clearTimeout(hardTimeout)
                }

                xhr.send(formData)
            })

            setUploadState((prev) => ({ ...prev, progress: 100, processing: false }))
            if (data?.url) {
                data.url = toStorageMediaUrl(data.url)
            }
            return data
        } catch (error) {
            console.error('File upload error:', error)
            showToast('文件上传失败: ' + error.message, 'error') // Replaced alert
            return null
        } finally {
            finishUploadState()
        }
    }

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        const isImage = file.type.startsWith('image/')
        let optimisticUrl = null

        if (isImage) {
            optimisticUrl = URL.createObjectURL(file)
            const insertedOptimistic = editorRef.current?.insertImage(optimisticUrl)
            if (!insertedOptimistic) {
                URL.revokeObjectURL(optimisticUrl)
                optimisticUrl = null
            }
        }

        const result = await uploadFile(file)
        if (result && result.url) {
            window.dispatchEvent(new CustomEvent('mynote:storage-changed'))
            // 根据文件类型决定插入方式
            if (isImage) {
                if (optimisticUrl) {
                    const replaced = editorRef.current?.replaceMediaUrl?.(optimisticUrl, result.url)
                    if (!replaced) {
                        editorRef.current?.removeMediaByUrl?.(optimisticUrl)
                        const inserted = editorRef.current?.insertImage(result.url)
                        if (!inserted) {
                            editorRef.current?.insertFileLink(result.url, file.name, formatFileSize(file.size), file.name.split('.').pop()?.toUpperCase() || 'FILE', file.type)
                        }
                    }
                    window.setTimeout(() => {
                        const latestHtml = editorRef.current?.getHTML?.() || ''
                        if (!latestHtml.includes(optimisticUrl)) {
                            URL.revokeObjectURL(optimisticUrl)
                        }
                    }, 60000)
                } else {
                    const inserted = editorRef.current?.insertImage(result.url)
                    if (!inserted) {
                        editorRef.current?.insertFileLink(result.url, file.name, formatFileSize(file.size), file.name.split('.').pop()?.toUpperCase() || 'FILE', file.type)
                        showToast('图片未能直接渲染，已插入下载链接', 'warning')
                    }
                }
            } else {
                // 插入文件链接
                const fileName = file.name
                const fileSize = formatFileSize(file.size)
                const fileExt = fileName.split('.').pop()?.toUpperCase() || 'FILE'
                const mimeType = file.type
                editorRef.current?.insertFileLink(result.url, fileName, fileSize, fileExt, mimeType)
            }

            const syncedHtml = editorRef.current?.getHTML?.() || content || ''
            setContent(syncedHtml)
            await persistContentNow({ expectedUrl: result.url, verifyRetries: 1 })
        } else if (optimisticUrl) {
            const cleaned = editorRef.current?.removeMediaByUrl?.(optimisticUrl)
            if (!cleaned) {
                const escaped = optimisticUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                const currentHtml = editorRef.current?.getHTML?.() || content || ''
                const nextHtml = String(currentHtml).replace(new RegExp(`<img[^>]*src=["']${escaped}["'][^>]*>`, 'gi'), '')
                editorRef.current?.setContent?.(nextHtml)
                setContent(nextHtml)
            }
            URL.revokeObjectURL(optimisticUrl)
        }

        if (result && result.url && isImage && optimisticUrl) {
            showToast('图片已上传', 'success')
        }

        // Reset input
        e.target.value = ''
    }

    // 格式化文件大小
    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    }

    const handleToolbarAction = (action) => {
        if (!editorRef.current) return

        switch (action) {
            case 'bold':
                editorRef.current.toggleBold()
                break
            case 'italic':
                editorRef.current.toggleItalic()
                break
            case 'underline':
                editorRef.current.toggleUnderline()
                break
            case 'list':
                editorRef.current.toggleBulletList()
                break
            case 'checkbox':
                editorRef.current.toggleTaskList()
                break
            case 'codeblock':
                editorRef.current.toggleCodeBlock()
                break
            case 'image':
            case 'file':
                fileInputRef.current?.click()
                break
        }
    }

    const handleContentUpdate = (newContent) => {
        setContent(newContent)
    }

    useEffect(() => {
        if (!isDraftNote || !hasMeaningfulDraftContent(content)) return
        if (draftCreationRef.current) return
        if (hasBlobMediaUrl(content)) return

        draftCreationRef.current = true

        const createRealNoteFromDraft = async () => {
            const textContent = htmlToPlainText(content)
            const firstLine = textContent.split('\n')[0].slice(0, 50).trim()
            const newTitle = firstLine || ''

            try {
                setSaving(true)
                const created = await createNote({ title: newTitle, content })
                setSelectedNote(created)
                setLastSaved(new Date())
            } catch (err) {
                console.error('创建草稿失败:', err)
                draftCreationRef.current = false
            } finally {
                setSaving(false)
            }
        }

        void createRealNoteFromDraft()
    }, [content, createNote, isDraftNote, setSelectedNote])

    const persistContentNow = async ({ expectedUrl = null, verifyRetries = 0 } = {}) => {
        if (!note || currentView === 'trash' || isDraftNote) return false
        const latestContent = editorRef.current?.getHTML?.() || content
        if (!latestContent || hasBlobMediaUrl(latestContent)) return false
        const textContent = htmlToPlainText(latestContent)
        const firstLine = textContent.split('\n')[0].slice(0, 50).trim()
        const newTitle = firstLine || ''

        const verifyPersistedMedia = async () => {
            if (!expectedUrl || !isSyncModeEnabled()) return true
            const serverNote = await notesApi.getOne(note.id)
            const rawServerContent = String(serverNote?.content || '')
            const serverContent = normalizeMediaUrls(serverNote?.content || '')
            const expectedAbsolute = toAbsoluteUrl(expectedUrl)
            const expectedStorage = toStorageMediaUrl(expectedUrl)
            const candidates = Array.from(new Set([expectedUrl, expectedAbsolute, expectedStorage].filter(Boolean)))
            return candidates.some((candidate) => rawServerContent.includes(candidate) || serverContent.includes(candidate))
        }

        try {
            setSaving(true)
            await updateNote(note.id, { title: newTitle, content: latestContent })

            let persisted = await verifyPersistedMedia()
            let attempt = 0
            while (!persisted && attempt < verifyRetries) {
                attempt += 1
                await sleep(220)
                await updateNote(note.id, { title: newTitle, content: latestContent })
                persisted = await verifyPersistedMedia()
            }

            if (!persisted && expectedUrl) {
                showToast('附件已上传，已重试保存；若仍未显示请稍后再打开该笔记', 'warning')
                return false
            }

            setLastSaved(new Date())
            return true
        } catch (error) {
            console.error('即时保存失败:', error)
            return false
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!note) return
        const confirmed = await confirm({
            title: '删除笔记',
            message: '确定要删除这篇笔记吗？此操作会将笔记移入废纸篓。',
            confirmText: '删除',
            danger: true
        })
        if (confirmed) {
            await deleteNote(note.id)
        }
    }

    const handleToggleFavorite = async () => {
        if (note) {
            await toggleFavorite(note.id)
        }
    }

    const handleRestore = async () => {
        if (note) {
            await restoreNote(note.id)
        }
    }

    const handlePermanentDelete = async () => {
        if (!note) return
        const confirmed = await confirm({
            title: '彻底删除',
            message: '此操作不可撤销，笔记将被永久删除。确定要继续吗？',
            confirmText: '永久删除',
            danger: true
        })
        if (confirmed) {
            await permanentDeleteNote(note.id)
        }
    }

    // 移动笔记到文件夹
    const handleMoveToFolder = async (folderId) => {
        if (!note) return
        try {
            await moveNoteToFolder(note.id, folderId)
            setShowFolderMenu(false)
            setShowShareMenu(false)
        } catch (error) {
            showToast('移动失败: ' + error.message, 'error') // Replaced alert
        }
    }

    // 点击外部关闭文件夹菜单
    useEffect(() => {
        const handleClickOutside = (event) => {
            const clickedDesktopFolder = folderMenuRef.current?.contains(event.target)
            const clickedMobileFolder = mobileFolderMenuRef.current?.contains(event.target)
            if (!clickedDesktopFolder && !clickedMobileFolder) {
                setShowFolderMenu(false)
            }
            const clickedDesktopShare = shareMenuRef.current?.contains(event.target)
            const clickedMobileShare = mobileShareMenuRef.current?.contains(event.target)
            if (!clickedDesktopShare && !clickedMobileShare) {
                setShowShareMenu(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        let mounted = true
        const loadShareInfo = async () => {
            if (!note?.id || !isSyncModeEnabled()) {
                if (mounted) setShareInfo({ enabled: false, shareUrl: null, sharedAt: null })
                return
            }
            try {
                const data = await notesApi.getShareInfo(note.id)
                if (mounted) {
                    setShareInfo({
                        enabled: !!data?.enabled,
                        shareUrl: data?.shareUrl || null,
                        sharedAt: data?.sharedAt || null,
                    })
                }
            } catch {
                if (mounted) setShareInfo({ enabled: false, shareUrl: null, sharedAt: null })
            }
        }
        loadShareInfo()
        return () => {
            mounted = false
        }
    }, [note?.id])

    // 置顶/取消置顶
    const handleTogglePin = async () => {
        if (note) {
            await togglePin(note.id)
        }
    }

    // 复制文本
    const handleCopyText = async () => {
        try {
            const textContent = htmlToPlainText(note.content || '')

            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(textContent)
            } else {
                const textArea = document.createElement("textarea")
                textArea.value = textContent
                document.body.appendChild(textArea)
                textArea.select()
                document.execCommand("copy")
                document.body.removeChild(textArea)
            }

            setShareMessage('已复制到剪贴板')
            setTimeout(() => setShareMessage(''), 2000)
            setShowShareMenu(false)
            showToast('已复制到剪贴板', 'success')
        } catch (error) {
            showToast('复制失败: ' + error.message, 'error') // Replaced alert
        }
    }

    // 转为图片分享 - 生成预览弹窗
    const handleShareAsImage = async () => {
        let container
        try {
            setShareMessage('正在生成图片...')

            container = document.createElement('div')
            container.style.cssText = `
                position: fixed;
                left: -9999px;
                top: 0;
                width: 480px;
                padding: 32px;
                background: white;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            `

            container.innerHTML = `
                <style>
                    .mynote-share-render pre { background: #1e293b; color: #e2e8f0; padding: 16px; border-radius: 8px; margin: 16px 0; font-size: 13px; line-height: 1.6; white-space: pre-wrap; word-break: break-all; overflow-wrap: break-word; }
                    .mynote-share-render pre code { background: none; padding: 0; color: inherit; font-size: inherit; border-radius: 0; }
                    .mynote-share-render code { background: #f1f5f9; color: #e11d48; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; }
                    .mynote-share-render img { display: block; max-width: 100%; height: auto; border-radius: 8px; margin: 16px 0; }
                    .mynote-share-render p { margin: 8px 0; }
                </style>
                <div class="mynote-share-render" style="font-size: 16px; line-height: 1.8; color: #374151;">
                    ${note.content || '<p style="color: #9ca3af;">暂无内容</p>'}
                </div>
                <div style="margin-top: 32px; padding-top: 20px; text-align: center; border-top: 1px solid #f3f4f6;">
                    <div style="display: inline-flex; align-items: center; justify-content: center; opacity: 0.8;">
                        <span style="color: #3B82F6; font-weight: 800; font-size: 16px; letter-spacing: -0.5px;">My</span><span style="color: #374151; font-weight: 600; font-size: 16px; letter-spacing: -0.5px;">Note</span>
                    </div>
                </div>
            `
            document.body.appendChild(container)

            await pauseForPaint()

            const renderScale = Math.min(window.devicePixelRatio || 1, 1.5)
            const { default: html2canvas } = await import('html2canvas')

            const canvas = await html2canvas(container, {
                backgroundColor: '#ffffff',
                scale: renderScale,
                useCORS: true,
                logging: false,
                width: 480,
            })

            const blob = await canvasToBlob(canvas)
            const imageUrl = URL.createObjectURL(blob)

            if (previewImage?.startsWith('blob:')) {
                URL.revokeObjectURL(previewImage)
            }

            setPreviewBlob(blob)
            setPreviewImage(imageUrl)

            setShareMessage('')
        } catch (error) {
            showToast('生成图片失败: ' + error.message, 'error') // Replaced alert
            setShareMessage('')
        } finally {
            if (container?.parentNode) {
                container.parentNode.removeChild(container)
            }
        }
    }

    const handleShareLink = async () => {
        try {
            const data = await notesApi.createShareLink(note.id)
            const link = data?.shareUrl
            if (!link) throw new Error('生成分享链接失败')
            setShareInfo({ enabled: true, shareUrl: link, sharedAt: data?.sharedAt || new Date().toISOString() })

            const title = getNoteTitle().slice(0, 60)

            if (navigator.share) {
                await navigator.share({
                    title,
                    text: `${title}\n只读分享`,
                    url: link,
                })
                setShareMessage('已调起链接分享')
                showToast('已调起链接分享', 'success')
            } else if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(link)
                setShareMessage('链接已复制')
                showToast('链接已复制', 'success')
            } else {
                const textArea = document.createElement('textarea')
                textArea.value = link
                document.body.appendChild(textArea)
                textArea.select()
                document.execCommand('copy')
                document.body.removeChild(textArea)
                setShareMessage('链接已复制')
                showToast('链接已复制', 'success')
            }

            setTimeout(() => setShareMessage(''), 2000)
            setShowShareMenu(false)
        } catch (error) {
            const message = String(error?.message || '')
            if (message.includes('Cannot POST') && message.includes('/share')) {
                showToast('链接分享失败：后端未更新，请先部署 API 的分享接口', 'error')
                return
            }
            showToast('链接分享失败: ' + error.message, 'error')
        }
    }

    const handleCopyShareLink = async () => {
        try {
            if (!shareInfo?.enabled || !shareInfo?.shareUrl) {
                showToast('当前笔记尚未生成分享链接', 'warning')
                return
            }
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(shareInfo.shareUrl)
            } else {
                const textArea = document.createElement('textarea')
                textArea.value = shareInfo.shareUrl
                document.body.appendChild(textArea)
                textArea.select()
                document.execCommand('copy')
                document.body.removeChild(textArea)
            }
            showToast('分享链接已复制', 'success')
            setShowShareMenu(false)
        } catch (error) {
            showToast('复制失败: ' + error.message, 'error')
        }
    }

    const handleRevokeShareLink = async () => {
        try {
            await notesApi.revokeShareLink(note.id)
            setShareInfo({ enabled: false, shareUrl: null, sharedAt: null })
            showToast('已关闭链接分享', 'success')
            setShowShareMenu(false)
        } catch (error) {
            showToast('关闭分享失败: ' + error.message, 'error')
        }
    }

    // 下载图片
    const handleDownloadImage = () => {
        if (!previewImage) return
        const a = document.createElement('a')
        a.href = previewImage
        a.download = `note-${Date.now()}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setShareMessage('图片已下载')
        setTimeout(() => setShareMessage(''), 2000)
        clearPreview()
    }

    const notifyImageCopied = () => {
        setShareMessage('图片已复制到剪贴板')
        setTimeout(() => setShareMessage(''), 2000)
        showToast('图片已复制到剪贴板', 'success')
    }

    // 复制图片到剪贴板
    const handleCopyImage = async () => {
        if (!previewBlob) return
        try {
            if (navigator.clipboard && navigator.clipboard.write && window.ClipboardItem) {
                await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': previewBlob })
                ])
                notifyImageCopied()
                clearPreview()
            } else {
                const copied = await copyImageViaExecCommand(previewBlob)
                if (copied) {
                    notifyImageCopied()
                    clearPreview()
                } else {
                    showToast('当前浏览器不支持复制图片，请使用左侧“下载图片”。', 'warning')
                }
            }
        } catch (error) {
            try {
                const copied = await copyImageViaExecCommand(previewBlob)
                if (copied) {
                    notifyImageCopied()
                    clearPreview()
                    return
                }
            } catch {
            }
            showToast('复制图片失败: ' + error.message, 'error')
        }
    }

    // 关闭预览弹窗
    const handleClosePreview = () => {
        clearPreview()
    }


    // 获取笔记标题文本
    const getNoteTitle = () => {
        return htmlToPlainText(note?.content || '').split('\n')[0].slice(0, 50).trim() || '\u65b0\u5efa\u7b14\u8bb0'
    }

    // 导出为 Markdown
    const exportAsMarkdown = async () => {
        const { default: TurndownService } = await import('turndown')
        const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' })
        const markdown = td.turndown(note?.content || '')
        const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${getNoteTitle().slice(0, 30)}.md`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        setShareMessage('\u5df2\u5bfc\u51fa Markdown')
        setTimeout(() => setShareMessage(''), 2000)
        setShowShareMenu(false)
    }

    // 导出为纯文本
    const exportAsText = () => {
        const text = htmlToPlainText(note?.content || '')
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${getNoteTitle().slice(0, 30)}.txt`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        setShareMessage('\u5df2\u5bfc\u51fa\u7eaf\u6587\u672c')
        setTimeout(() => setShareMessage(''), 2000)
        setShowShareMenu(false)
    }

    const formatDate = (dateString) => {
        if (!dateString) return ''
        return new Date(dateString).toLocaleString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    // 获取当前文件夹名称
    const currentFolderName = note?.folderId
        ? folders.find(f => f.id === note.folderId)?.name
        : (currentView === 'all' ? '全部' : (currentView === 'favorites' ? '收藏' : '未分类'));

    const displayTitle = (() => {
        const textContent = htmlToPlainText(note?.content || '')
        return textContent.split('\n')[0].slice(0, 40) || note?.title || '新建笔记'
    })()

    const desktopTopButtonClass = 'w-8 h-8 flex items-center justify-center rounded-xl text-[#5f6b7c] hover:text-[#182233] hover:bg-[#eef3f8] dark:text-[#9aa8ba] dark:hover:text-white dark:hover:bg-white/10 transition-colors'
    const desktopTopButtonActiveClass = 'text-[#2563eb] bg-[#eaf1ff] dark:text-[#78a8ff] dark:bg-[#1f365f]'

    const isMediaOnlyNote = /^<p><img[^>]+><br class="ProseMirror-trailingBreak"><\/p>$/i.test((content || '').trim()) || (() => {
        const html = String(content || '').trim()
        if (!html) return false

        const temp = document.createElement('div')
        temp.innerHTML = html
        temp.querySelectorAll('br.ProseMirror-trailingBreak').forEach((node) => node.remove())

        const mediaCount = temp.querySelectorAll('img,video,audio,audio-player-component,video-player-component').length
        temp.querySelectorAll('img,video,audio,audio-player-component,video-player-component').forEach((node) => node.remove())
        const text = (temp.textContent || '').replace(/\u00a0/g, ' ').trim()

        return mediaCount > 0 && text.length === 0
    })()

    if (!note) {
        const overviewNotes = (notes || []).slice(0, 24)
        return (
            <main className="editor-stage flex-1 overflow-y-auto md:p-6 md:pl-5">
                <div className="max-w-[1280px] mx-auto min-h-full flex flex-col">
                    <div className="hidden md:flex items-center justify-between px-1 pb-5">
                        <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-[#8f8780]">
                            <button className="h-9 px-3 rounded-xl bg-white/62 dark:bg-[#182432] border border-white/60 dark:border-[#2d3a49] inline-flex items-center gap-1.5 font-medium text-gray-500 dark:text-[#a8b7c7]">
                                <span className="material-icons-outlined text-sm">tune</span>
                                筛选
                            </button>
                            <span>排序: 最近编辑</span>
                        </div>
                        <button
                            onClick={handleCreateDraft}
                            className="h-12 w-12 rounded-2xl bg-[#2563eb] text-white shadow-[0_16px_34px_rgba(37,99,235,0.34)] hover:bg-[#1d4ed8] transition-colors inline-flex items-center justify-center"
                            title="创建新笔记"
                        >
                            <span className="material-icons-outlined">add</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 auto-rows-[160px] content-start">
                        <button
                            onClick={handleCreateDraft}
                            className="surface-card rounded-[24px] border-dashed bg-white/34 dark:bg-[#182431]/46 text-gray-400 dark:text-[#8fabc2] hover:text-sky-600 dark:hover:text-sky-300 transition-colors flex flex-col items-center justify-center gap-2 min-h-[160px]"
                        >
                            <span className="material-icons-outlined text-3xl">add_circle</span>
                            <span className="text-sm font-medium">创建新笔记</span>
                        </button>

                        {overviewNotes.map((item, index) => {
                            const { image, lines } = extractOverviewContent(item.content)
                            const title = lines[0] || item.title || '新建笔记'
                            const body = lines.slice(1).join(' ').slice(0, 90)
                            const accentMap = [
                                'bg-[#edf5fb] dark:bg-[#1b2531]',
                                'bg-[#eef3fa] dark:bg-[#1a2430]',
                                'bg-[#edf7f8] dark:bg-[#18242a]',
                                'bg-[#f1f5fb] dark:bg-[#1b2432]',
                            ]
                            const tagMap = ['灵感快照', '技术沉淀', '今日文稿', '个人记录']
                            const cardClass = index === 0 ? 'xl:col-span-2' : ''

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setSelectedNote(item)}
                                    className={`surface-card ${accentMap[index % accentMap.length]} ${cardClass} rounded-[24px] p-4 text-left hover:-translate-y-0.5 transition-transform flex flex-col justify-between`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/75 dark:bg-white/10 text-sky-600 dark:text-sky-300 mb-3">{tagMap[index % tagMap.length]}</span>
                                            <h3 className="text-[17px] leading-snug font-bold text-[#24324a] dark:text-[#f3ede7] line-clamp-2">{title}</h3>
                                        </div>
                                        <span className="text-[11px] text-gray-400 dark:text-[#928a84] whitespace-nowrap">{formatDate(item.updatedAt)}</span>
                                    </div>

                                    {image && (
                                        <div className="mt-3 h-24 rounded-[18px] overflow-hidden border border-white/60 dark:border-white/10">
                                            <img src={image} alt="" className="w-full h-full object-cover" />
                                        </div>
                                    )}

                                    {!image && body && (
                                        <p className="mt-3 text-sm leading-6 text-gray-500 dark:text-[#a59d96] line-clamp-3">{body}</p>
                                    )}

                                    <div className="pt-3 mt-auto flex items-center justify-between text-[11px] text-gray-400 dark:text-[#8f8780]">
                                        <span>{currentView === 'favorites' ? '收藏夹' : '全部笔记'}</span>
                                        <span className="material-icons-outlined text-base">more_horiz</span>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>
            </main>
        )
    }

    if (!isOverlayDrawer) {
        return (
            <main className="editor-stage flex-1 h-full min-h-0 flex flex-col overflow-hidden relative">
                <div className="flex-1 min-h-0 pt-[calc(env(safe-area-inset-top)+6px)] px-3 pb-0 z-20 md:px-0" data-editor-track="px-3 md:px-0">
                    <div className="surface-card max-w-4xl bg-[#fbfcfe]/96 dark:bg-[#211d1b]/86 rounded-[28px] mx-auto h-full px-3 pt-1 pb-3 shadow-sm flex flex-col border border-[#e8eef5] dark:border-[#2a3645]">
                        <div className="h-12 flex items-center justify-between border-b border-[#e8eef5] dark:border-[#2a3645]">
                            <div className="flex items-center text-sm text-gray-500 dark:text-text-muted min-w-0 flex-1 overflow-hidden whitespace-nowrap">
                                <button
                                    onClick={onBack}
                                    className="mr-2 p-1 -ml-1 rounded-md hover:bg-gray-100 dark:hover:bg-card-dark text-gray-600 dark:text-text-muted transition-colors flex-shrink-0"
                                    aria-label="返回列表"
                                >
                                    <span className="material-icons-outlined text-2xl leading-none">arrow_back</span>
                                </button>
                            </div>

                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                {currentView === 'trash' ? (
                                    <>
                                        <button
                                            onClick={handleRestore}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 dark:text-text-muted dark:hover:text-green-400 transition-all"
                                            title="恢复"
                                        >
                                            <span className="material-icons-outlined text-[20px]">restore</span>
                                        </button>
                                        <button
                                            onClick={handlePermanentDelete}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 dark:text-text-muted dark:hover:text-red-400 transition-all"
                                            title="彻底删除"
                                        >
                                            <span className="material-icons-outlined text-[20px]">delete_forever</span>
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={handleToggleFavorite}
                                            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${note.isFavorite
                                                ? 'text-red-500 bg-red-50 dark:bg-red-900/40'
                                                : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:text-gray-500 dark:hover:text-red-400 dark:hover:bg-red-900/30'
                                                }`}
                                            title={note.isFavorite ? '取消收藏' : '收藏'}
                                        >
                                            <span className="material-icons-outlined text-[20px] leading-none">{note.isFavorite ? 'favorite' : 'favorite_border'}</span>
                                        </button>
                                        <button
                                            onClick={handleDelete}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:text-gray-500 dark:hover:text-red-400 dark:hover:bg-red-900/30 transition-all"
                                            title="删除"
                                        >
                                            <span className="material-icons-outlined text-[20px] leading-none">delete_outline</span>
                                        </button>
                                        <div className="relative" ref={mobileShareMenuRef}>
                                            <button
                                                onClick={() => setShowShareMenu(!showShareMenu)}
                                                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${showShareMenu
                                                    ? 'text-primary bg-primary/10'
                                                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-700/60'
                                                    }`}
                                                title="更多选项"
                                            >
                                                <span className="material-icons-outlined text-[20px] leading-none">more_horiz</span>
                                            </button>

                                            {showShareMenu && (
                                                <div className="menu-panel absolute right-0 top-full mt-2 border border-gray-200 dark:border-gray-600 rounded-xl z-50 py-2 min-w-[190px]">
                                                    <div className="px-3 py-1 text-[11px] font-semibold text-gray-400 dark:text-text-tertiary">分组</div>
                                                    <div className="relative" ref={mobileFolderMenuRef}>
                                                        <button
                                                            onClick={() => setShowFolderMenu(!showFolderMenu)}
                                                            className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                        >
                                                            <span className="material-icons-outlined text-lg mr-2">drive_file_move</span>
                                                            移动到分组
                                                            <span className="material-icons-outlined text-base ml-auto text-gray-400">{showFolderMenu ? 'expand_less' : 'expand_more'}</span>
                                                        </button>
                                                        {showFolderMenu && (
                                                            <div className="mx-2 mb-1 rounded-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
                                                                <button
                                                                    onClick={() => handleMoveToFolder(null)}
                                                                    className={`w-full flex items-center px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${!note.folderId ? 'text-primary' : 'text-gray-700 dark:text-gray-300'}`}
                                                                >
                                                                    <span className="material-icons-outlined text-lg mr-2">folder_off</span>
                                                                    未分组
                                                                    {!note.folderId && <span className="material-icons-outlined text-sm ml-auto">check</span>}
                                                                </button>
                                                                {folders && folders.map(folder => (
                                                                    <button
                                                                        key={`mobile-folder-${folder.id}`}
                                                                        onClick={() => handleMoveToFolder(folder.id)}
                                                                        className={`w-full flex items-center px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${note.folderId === folder.id ? 'text-primary' : 'text-gray-700 dark:text-gray-300'}`}
                                                                    >
                                                                        <span className="material-icons-outlined text-lg mr-2">folder</span>
                                                                        <span className="truncate">{folder.name}</span>
                                                                        {note.folderId === folder.id && <span className="material-icons-outlined text-sm ml-auto">check</span>}
                                                                    </button>
                                                                ))}
                                                                {(!folders || folders.length === 0) && (
                                                                    <p className="px-3 py-2 text-xs text-gray-400 dark:text-text-tertiary">暂无分组</p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>

                                                    <div className="px-3 py-1 text-[11px] font-semibold text-gray-400 dark:text-text-tertiary">分享</div>
                                                    <button onClick={handleCopyText} className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                                        <span className="material-icons-outlined text-lg mr-2">content_copy</span>
                                                        复制文本
                                                    </button>
                                                    <button onClick={handleShareAsImage} className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                                        <span className="material-icons-outlined text-lg mr-2">image</span>
                                                        图片分享
                                                    </button>
                                                    <button onClick={handleShareLink} className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                                        <span className="material-icons-outlined text-lg mr-2">link</span>
                                                        链接分享
                                                    </button>
                                                    <button onClick={handleCopyShareLink} className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                                        <span className="material-icons-outlined text-lg mr-2">content_copy</span>
                                                        复制分享链接
                                                    </button>
                                                    {shareInfo.enabled && (
                                                        <button onClick={handleRevokeShareLink} className="w-full flex items-center px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                                            <span className="material-icons-outlined text-lg mr-2">link_off</span>
                                                            关闭链接分享
                                                        </button>
                                                    )}
                                                    <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>
                                                    <div className="px-3 py-1 text-[11px] font-semibold text-gray-400 dark:text-text-tertiary">导出</div>
                                                    <button onClick={exportAsMarkdown} className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                                        <span className="material-icons-outlined text-lg mr-2">description</span>
                                                        导出 Markdown
                                                    </button>
                                                    <button onClick={exportAsText} className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                                        <span className="material-icons-outlined text-lg mr-2">text_snippet</span>
                                                        导出纯文本
                                                    </button>
                                                    <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>
                                                    <div className="px-3 py-1 text-[11px] font-semibold text-gray-400 dark:text-text-tertiary">管理</div>
                                                    <button onClick={handleTogglePin} className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                                        <span className="material-icons-outlined text-lg mr-2">push_pin</span>
                                                        {note.isPinned ? '取消置顶' : '置顶'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className={`flex-1 min-h-0 overflow-y-auto no-scrollbar pt-3 ${isMediaOnlyNote ? 'pb-0' : 'pb-[72px]'}`}>
                            <div className="mb-2.5 text-sm text-gray-400 dark:text-text-tertiary">
                                {formatDate(note.updatedAt)}
                            </div>
                            <div className="border-b border-dashed border-gray-200 dark:border-gray-700 mb-3"></div>
                            <TipTapEditor
                                ref={editorRef}
                                content={content}
                                onUpdate={handleContentUpdate}
                                className={isMediaOnlyNote ? 'media-only-editor' : ''}
                                onUploadImage={async (file) => {
                                    const result = await uploadFile(file)
                                    if (result?.url) {
                                        window.dispatchEvent(new CustomEvent('mynote:storage-changed'))
                                        return result.url
                                    }
                                    return null
                                }}
                                disabled={currentView === 'trash'}
                            />
                        </div>
                    </div>
                </div>

                {uploadState.active && (
                    <div className="fixed z-40 left-4 right-4 md:left-auto md:right-6 bottom-24 md:bottom-6 md:w-80 bg-white/95 dark:bg-card-dark/95 backdrop-blur border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg px-3 py-2">
                        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300 mb-1.5 gap-2">
                            <span className="truncate">{uploadState.processing ? '服务器处理中' : '上传中'}: {uploadState.fileName}</span>
                            <span className="tabular-nums">{uploadState.progress}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-150"
                                style={{ width: `${uploadState.progress}%` }}
                            />
                        </div>
                    </div>
                )}

                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileUpload}
                    accept="image/*"
                />

                {currentView !== 'trash' && <EditorToolbar onAction={handleToolbarAction} compact />}
                <ConfirmDialog />

                {previewImage && createPortal(
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={handleClosePreview}>
                        <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden relative max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                            <button
                                onClick={handleClosePreview}
                                className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors z-10"
                            >
                                <span className="material-icons-outlined text-lg leading-none">close</span>
                            </button>

                            <div className="p-4 overflow-y-auto flex-1">
                                <img
                                    src={previewImage}
                                    alt="笔记图片"
                                    className="w-full rounded-xl shadow-sm"
                                />
                            </div>

                            <div className="flex border-t border-gray-100 dark:border-border-dark flex-shrink-0">
                                <button
                                    onClick={handleDownloadImage}
                                    className="flex-1 py-3 text-gray-600 dark:text-text-muted hover:bg-gray-50 dark:hover:bg-card-dark transition-colors font-medium flex items-center justify-center gap-1.5"
                                >
                                    <span className="material-icons-outlined text-lg leading-none">download</span>
                                    下载图片
                                </button>
                                <button
                                    onClick={handleCopyImage}
                                    className="flex-1 py-3 text-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors font-medium border-l border-gray-100 dark:border-border-dark flex items-center justify-center gap-1.5"
                                >
                                    <span className="material-icons-outlined text-lg leading-none">content_copy</span>
                                    复制到剪贴板
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
            </main>
        )
    }

    return (
        <main data-note-detail-shell={isOverlayDrawer ? 'open-canvas' : undefined} className={`editor-stage flex-1 h-full min-h-0 flex flex-col overflow-hidden relative ${isOverlayDrawer ? 'overlay-stage-reset note-detail-open-canvas bg-transparent md:px-3 md:pt-5 md:pb-6' : 'md:p-6 md:pl-5'}`}>
            {isOverlayDrawer && (
                <div data-note-detail-topbar="floating" className="hidden md:grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-4 z-30">
                    <div
                        data-note-detail-return-group="true"
                        className="justify-self-start flex h-12 w-[312px] max-w-[calc(100vw-7rem)] min-w-0 overflow-hidden rounded-[24px] bg-white dark:bg-[#111925] px-3 py-2 shadow-[0_10px_22px_rgba(15,23,42,0.05)] dark:shadow-[0_18px_30px_rgba(2,6,14,0.24)] border border-[#eef2f6] dark:border-[#283445]"
                    >
                        <button
                            type="button"
                            onClick={onBack}
                            className="shrink-0 inline-flex h-8 items-center gap-1.5 rounded-2xl px-2.5 text-[15px] font-medium text-[#221d1b] transition-all hover:bg-[#f4f6f8] active:scale-95 dark:text-[#f6f1eb] dark:hover:bg-[#162131]"
                            aria-label="返回首页"
                            title="返回首页"
                        >
                            <span className="material-icons-outlined text-[19px] leading-none">arrow_back</span>
                            <span>返回</span>
                        </button>
                        <span className="mx-2 h-5 w-px self-center bg-[#e5eaf0] dark:bg-[#283445]"></span>
                        <span className="flex min-w-0 flex-1 items-center gap-2 text-[15px] font-medium text-[#5f6b7c] dark:text-[#98a2b3]">
                            <span className="material-icons-outlined shrink-0 text-[18px] leading-none text-[#8994a3] dark:text-[#718096]">folder_open</span>
                            <span className="min-w-0 flex-1 truncate">
                                <span className="text-[#172033] dark:text-white">笔记</span>
                                <span className="mx-1.5 text-[#9aa4b2]">/</span>
                                <span>{currentFolderName}</span>
                                <span className="mx-1.5 text-[#9aa4b2]">/</span>
                                <span>{displayTitle}</span>
                            </span>
                        </span>
                    </div>

                    <div className="h-10 px-4 inline-flex items-center justify-center rounded-2xl text-[13px] font-medium text-[#7b8797] dark:text-[#a9b6c8]">
                        {saving ? (
                            <>
                                <span className="w-2 h-2 rounded-full bg-amber-500 mr-2 animate-pulse"></span>
                                保存中
                            </>
                        ) : (
                            <>
                                <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                                已保存
                            </>
                        )}
                    </div>

                    <div className="justify-self-end h-10 inline-flex items-center gap-1 rounded-2xl border border-white/70 bg-white/78 px-2 shadow-[0_12px_34px_rgba(31,41,55,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-[#172232]/78">
                        {currentView === 'trash' ? (
                            <>
                                <button onClick={handleRestore} className={desktopTopButtonClass} title="恢复">
                                    <span className="material-icons-outlined text-[20px] leading-none">restore</span>
                                </button>
                                <button onClick={handlePermanentDelete} className={desktopTopButtonClass} title="彻底删除">
                                    <span className="material-icons-outlined text-[20px] leading-none">delete_forever</span>
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={handleToggleFavorite}
                                    className={`${desktopTopButtonClass} ${note.isFavorite ? desktopTopButtonActiveClass : ''}`}
                                    title={note.isFavorite ? '取消收藏' : '收藏'}
                                >
                                    <span className="material-icons-outlined text-[20px] leading-none">{note.isFavorite ? 'favorite' : 'favorite_border'}</span>
                                </button>
                                <button onClick={handleDelete} className={desktopTopButtonClass} title="删除">
                                    <span className="material-icons-outlined text-[20px] leading-none">delete_outline</span>
                                </button>
                                <button onClick={handleShareLink} className={desktopTopButtonClass} title="链接分享">
                                    <span className="material-icons-outlined text-[20px] leading-none">reply</span>
                                </button>
                                <div className="h-5 w-px bg-[#d8e0ea] dark:bg-white/12 mx-1"></div>
                                <button onClick={handleCopyText} className={desktopTopButtonClass} title="复制文本">
                                    <span className="material-icons-outlined text-[20px] leading-none">content_copy</span>
                                </button>
                                <div className="relative" ref={folderMenuRef}>
                                    <button
                                        onClick={() => setShowFolderMenu(!showFolderMenu)}
                                        className={`${desktopTopButtonClass} ${showFolderMenu ? desktopTopButtonActiveClass : ''}`}
                                        title="移动到分组"
                                    >
                                        <span className="material-icons-outlined text-[20px] leading-none">drive_file_move</span>
                                    </button>
                                    {showFolderMenu && (
                                        <div className="menu-panel absolute right-0 top-full mt-2 border border-gray-200 dark:border-gray-600 rounded-xl z-50 py-2 min-w-[180px]">
                                            <div className="px-3 py-2 text-xs font-semibold text-gray-400 dark:text-text-tertiary uppercase">移动到</div>
                                            <button
                                                onClick={() => handleMoveToFolder(null)}
                                                className={`w-full flex items-center px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${!note.folderId ? 'text-primary' : 'text-gray-700 dark:text-gray-300'}`}
                                            >
                                                <span className="material-icons-outlined text-lg mr-2">folder_off</span>
                                                未分类
                                                {!note.folderId && <span className="material-icons-outlined text-sm ml-auto">check</span>}
                                            </button>
                                            {folders && folders.map(folder => (
                                                <button
                                                    key={folder.id}
                                                    onClick={() => handleMoveToFolder(folder.id)}
                                                    className={`w-full flex items-center px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${note.folderId === folder.id ? 'text-primary' : 'text-gray-700 dark:text-gray-300'}`}
                                                >
                                                    <span className="material-icons-outlined text-lg mr-2">folder</span>
                                                    <span className="truncate">{folder.name}</span>
                                                    {note.folderId === folder.id && <span className="material-icons-outlined text-sm ml-auto">check</span>}
                                                </button>
                                            ))}
                                            {(!folders || folders.length === 0) && (
                                                <p className="px-3 py-2 text-xs text-gray-400 dark:text-text-tertiary">暂无文件夹</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <button onClick={handleShareAsImage} className={desktopTopButtonClass} title="生成图片分享">
                                    <span className="material-icons-outlined text-[20px] leading-none">image</span>
                                </button>
                                <button onClick={() => fileInputRef.current?.click()} className={desktopTopButtonClass} title="插入附件">
                                    <span className="material-icons-outlined text-[20px] leading-none">attach_file</span>
                                </button>
                                <div className="relative" ref={shareMenuRef}>
                                    <button
                                        onClick={() => setShowShareMenu(!showShareMenu)}
                                        className={`${desktopTopButtonClass} ${showShareMenu ? desktopTopButtonActiveClass : ''}`}
                                        title="导出文件"
                                    >
                                        <span className="material-icons-outlined text-[20px] leading-none">file_download</span>
                                    </button>
                                    {showShareMenu && (
                                        <div className="menu-panel absolute right-0 top-full mt-2 border border-gray-200 dark:border-gray-600 rounded-xl z-50 py-2 min-w-[160px]">
                                            <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 dark:text-text-tertiary">分享</div>
                                            <button onClick={handleCopyShareLink} className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                                <span className="material-icons-outlined text-lg mr-2">content_copy</span>
                                                复制分享链接
                                            </button>
                                            {shareInfo.enabled && (
                                                <button onClick={handleRevokeShareLink} className="w-full flex items-center px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                                    <span className="material-icons-outlined text-lg mr-2">link_off</span>
                                                    关闭链接分享
                                                </button>
                                            )}
                                            <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>
                                            <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 dark:text-text-tertiary">导出</div>
                                            <button onClick={exportAsMarkdown} className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                                <span className="material-icons-outlined text-lg mr-2">description</span>
                                                导出为 Markdown
                                            </button>
                                            <button onClick={exportAsText} className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                                <span className="material-icons-outlined text-lg mr-2">text_snippet</span>
                                                导出为纯文本
                                            </button>
                                            {shareMessage && (
                                                <p className="px-3 py-2 text-xs text-green-600 dark:text-green-400">{shareMessage}</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
            {/* 工具栏 (Header) */}
            <div className={`${isOverlayDrawer ? 'hidden' : 'pt-[calc(env(safe-area-inset-top)+6px)] md:pt-0 px-4 md:px-0 pb-0'} ${isOverlayDrawer ? 'md:pb-6' : 'md:pb-4'} z-20`}>
                <div className={`surface-card ${isOverlayDrawer ? 'bg-white dark:bg-[#111925] rounded-[22px] md:min-h-[64px] px-4 md:px-5 border border-[#e7edf5] dark:border-[#263241] shadow-none' : 'bg-[#ffffff]/94 dark:bg-[#24201e]/88 rounded-[28px] md:rounded-[24px] px-4 md:px-5'} h-14 md:h-[58px] flex items-center justify-between shadow-sm`}>
                    {/* 移动端返回按钮 + 面包屑导航 */}
                    <div className="flex items-center text-sm text-gray-500 dark:text-text-muted min-w-0 flex-1 overflow-hidden whitespace-nowrap">
                        {/* 移动端返回按钮 */}
                        <button
                            onClick={onBack}
                            className="md:hidden mr-2 p-1 -ml-1 rounded-md hover:bg-gray-100 dark:hover:bg-card-dark text-gray-600 dark:text-text-muted transition-colors flex-shrink-0"
                            aria-label="返回列表"
                        >
                            <span className="material-icons-outlined text-2xl leading-none">arrow_back</span>
                        </button>
                        <span className={`${isOverlayDrawer ? 'hidden lg:inline' : 'hidden md:inline'} hover:text-primary cursor-pointer transition-colors flex-shrink-0`}>笔记</span>
                        <span className={`${isOverlayDrawer ? 'hidden lg:inline' : 'hidden md:inline'} mx-2 flex-shrink-0`}>/</span>
                        <span className="hidden md:inline hover:text-primary cursor-pointer transition-colors flex-shrink-0">{currentFolderName}</span>
                        <span className="hidden md:inline mx-2 flex-shrink-0">/</span>
                        <span className={`hidden md:inline text-gray-900 dark:text-text-main ${isOverlayDrawer ? 'text-[14px]' : 'text-[15px] md:text-base'} font-medium truncate ${isOverlayDrawer ? 'max-w-[220px]' : 'max-w-[58vw] md:max-w-[200px]'}`}>
                            {(() => {
                                const textContent = htmlToPlainText(note.content || '')
                                return textContent.split('\n')[0].slice(0, 20) || '新建笔记'
                            })()}
                        </span>
                    </div>

                    {/* 右侧状态与操作 */}
                    <div className="flex items-center gap-2 md:gap-3 pl-3 md:pl-4">
                    <div className="hidden md:flex items-center text-xs text-gray-400 dark:text-gray-500">
                        {saving ? (
                            <>
                                <span className="w-2 h-2 rounded-full bg-amber-500 mr-2 animate-pulse"></span>
                                保存中
                            </>
                        ) : (
                            <>
                                <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                                已保存
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                        {currentView === 'trash' ? (
                            <>
                                <button
                                    onClick={handleRestore}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 dark:text-text-muted dark:hover:text-green-400 transition-all"
                                    title="恢复"
                                >
                                    <span className="material-icons-outlined text-[20px]">restore</span>
                                </button>
                                <button
                                    onClick={handlePermanentDelete}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 dark:text-text-muted dark:hover:text-red-400 transition-all"
                                    title="彻底删除"
                                >
                                    <span className="material-icons-outlined text-[20px]">delete_forever</span>
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={handleToggleFavorite}
                                    className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${note.isFavorite
                                        ? 'text-red-500 bg-red-50 dark:bg-red-900/40'
                                        : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:text-gray-500 dark:hover:text-red-400 dark:hover:bg-red-900/30'
                                        }`}
                                    title={note.isFavorite ? '取消收藏' : '收藏'}
                                >
                                    <span className="material-icons-outlined text-[20px] leading-none">{note.isFavorite ? 'favorite' : 'favorite_border'}</span>
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:text-gray-500 dark:hover:text-red-400 dark:hover:bg-red-900/30 transition-all"
                                    title="删除"
                                >
                                    <span className="material-icons-outlined text-[20px] leading-none">delete_outline</span>
                                </button>

                                {/* 移动端更多选项 */}
                                <div className="relative md:hidden" ref={mobileShareMenuRef}>
                                    <button
                                        onClick={() => setShowShareMenu(!showShareMenu)}
                                        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${showShareMenu
                                            ? 'text-primary bg-primary/10'
                                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-700/60'
                                            }`}
                                        title="更多选项"
                                    >
                                        <span className="material-icons-outlined text-[20px] leading-none">more_horiz</span>
                                    </button>

                                    {showShareMenu && (
                                        <div className="menu-panel absolute right-0 top-full mt-2 border border-gray-200 dark:border-gray-600 rounded-xl z-50 py-2 min-w-[190px]">
                                            <div className="px-3 py-1 text-[11px] font-semibold text-gray-400 dark:text-text-tertiary">分组</div>
                                            <div className="relative" ref={mobileFolderMenuRef}>
                                                <button
                                                    onClick={() => setShowFolderMenu(!showFolderMenu)}
                                                    className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                >
                                                    <span className="material-icons-outlined text-lg mr-2">drive_file_move</span>
                                                    移动到分组
                                                    <span className="material-icons-outlined text-base ml-auto text-gray-400">{showFolderMenu ? 'expand_less' : 'expand_more'}</span>
                                                </button>
                                                {showFolderMenu && (
                                                    <div className="mx-2 mb-1 rounded-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
                                                        <button
                                                            onClick={() => handleMoveToFolder(null)}
                                                            className={`w-full flex items-center px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${!note.folderId ? 'text-primary' : 'text-gray-700 dark:text-gray-300'}`}
                                                        >
                                                            <span className="material-icons-outlined text-lg mr-2">folder_off</span>
                                                            未分组
                                                            {!note.folderId && <span className="material-icons-outlined text-sm ml-auto">check</span>}
                                                        </button>
                                                        {folders && folders.map(folder => (
                                                            <button
                                                                key={`mobile-folder-${folder.id}`}
                                                                onClick={() => handleMoveToFolder(folder.id)}
                                                                className={`w-full flex items-center px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${note.folderId === folder.id ? 'text-primary' : 'text-gray-700 dark:text-gray-300'}`}
                                                            >
                                                                <span className="material-icons-outlined text-lg mr-2">folder</span>
                                                                <span className="truncate">{folder.name}</span>
                                                                {note.folderId === folder.id && <span className="material-icons-outlined text-sm ml-auto">check</span>}
                                                            </button>
                                                        ))}
                                                        {(!folders || folders.length === 0) && (
                                                            <p className="px-3 py-2 text-xs text-gray-400 dark:text-text-tertiary">暂无分组</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>

                                            <div className="px-3 py-1 text-[11px] font-semibold text-gray-400 dark:text-text-tertiary">分享</div>
                                            <button onClick={handleCopyText} className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                                <span className="material-icons-outlined text-lg mr-2">content_copy</span>
                                                复制文本
                                            </button>
                                            <button onClick={handleShareAsImage} className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                                <span className="material-icons-outlined text-lg mr-2">image</span>
                                                图片分享
                                            </button>
                                            <button onClick={handleShareLink} className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                                <span className="material-icons-outlined text-lg mr-2">link</span>
                                                链接分享
                                            </button>
                                            <button onClick={handleCopyShareLink} className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                                <span className="material-icons-outlined text-lg mr-2">content_copy</span>
                                                复制分享链接
                                            </button>
                                            {shareInfo.enabled && (
                                                <button onClick={handleRevokeShareLink} className="w-full flex items-center px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                                    <span className="material-icons-outlined text-lg mr-2">link_off</span>
                                                    关闭链接分享
                                                </button>
                                            )}
                                            <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>

                                            <div className="px-3 py-1 text-[11px] font-semibold text-gray-400 dark:text-text-tertiary">导出</div>
                                            <button onClick={exportAsMarkdown} className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                                <span className="material-icons-outlined text-lg mr-2">description</span>
                                                导出 Markdown
                                            </button>
                                            <button onClick={exportAsText} className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                                <span className="material-icons-outlined text-lg mr-2">text_snippet</span>
                                                导出纯文本
                                            </button>
                                            <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>

                                            <div className="px-3 py-1 text-[11px] font-semibold text-gray-400 dark:text-text-tertiary">管理</div>
                                            <button onClick={handleTogglePin} className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                                <span className="material-icons-outlined text-lg mr-2">push_pin</span>
                                                {note.isPinned ? '取消置顶' : '置顶'}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="hidden md:block w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1"></div>

                                {/* 移动到文件夹按鈕 */}
                                <div className="relative hidden md:block" ref={folderMenuRef}>
                                    <button
                                        onClick={() => setShowFolderMenu(!showFolderMenu)}
                                        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${showFolderMenu
                                            ? 'text-primary bg-primary/10 dark:bg-primary/20'
                                            : 'text-gray-400 hover:text-primary hover:bg-primary/5 dark:text-gray-500 dark:hover:text-primary dark:hover:bg-primary/10'
                                            }`}
                                        title="移动到文件夹"
                                    >
                                        <span className="material-icons-outlined text-[20px] leading-none">drive_file_move</span>
                                    </button>

                                    {/* 文件夹选择菜单 */}
                                    {showFolderMenu && (
                                        <div className="menu-panel absolute right-0 top-full mt-2 border border-gray-200 dark:border-gray-600 rounded-xl z-50 py-2 min-w-[180px]">
                                            <div className="px-3 py-2 text-xs font-semibold text-gray-400 dark:text-text-tertiary uppercase">移动到</div>

                                            {/* 未分类选项 */}
                                            <button
                                                onClick={() => handleMoveToFolder(null)}
                                                className={`w-full flex items-center px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${!note.folderId ? 'text-primary' : 'text-gray-700 dark:text-gray-300'
                                                    }`}
                                            >
                                                <span className="material-icons-outlined text-lg mr-2">folder_off</span>
                                                未分类
                                                {!note.folderId && <span className="material-icons-outlined text-sm ml-auto">check</span>}
                                            </button>

                                            {/* 文件夹列表 */}
                                            {folders && folders.map(folder => (
                                                <button
                                                    key={folder.id}
                                                    onClick={() => handleMoveToFolder(folder.id)}
                                                    className={`w-full flex items-center px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${note.folderId === folder.id ? 'text-primary' : 'text-gray-700 dark:text-gray-300'
                                                        }`}
                                                >
                                                    <span className="material-icons-outlined text-lg mr-2">folder</span>
                                                    <span className="truncate">{folder.name}</span>
                                                    {note.folderId === folder.id && <span className="material-icons-outlined text-sm ml-auto">check</span>}
                                                </button>
                                            ))}

                                            {(!folders || folders.length === 0) && (
                                                <p className="px-3 py-2 text-xs text-gray-400 dark:text-text-tertiary">暂无文件夹</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* 生成图片按鈕 */}
                                <button
                                    onClick={handleShareAsImage}
                                    className="hidden md:flex w-8 h-8 items-center justify-center rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 dark:text-gray-500 dark:hover:text-green-400 dark:hover:bg-green-900/30 transition-all"
                                    title="生成图片分享"
                                >
                                    <span className="material-icons-outlined text-[20px] leading-none">photo_camera</span>
                                </button>

                                {/* 链接分享 */}
                                <button
                                    onClick={handleShareLink}
                                    className="hidden md:flex w-8 h-8 items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-500 dark:hover:text-blue-400 dark:hover:bg-blue-900/30 transition-all"
                                    title="链接分享"
                                >
                                    <span className="material-icons-outlined text-[20px] leading-none">share</span>
                                </button>

                                {/* 导出菜单 */}
                                <div className="relative hidden md:block" ref={shareMenuRef}>
                                    <button
                                        onClick={() => setShowShareMenu(!showShareMenu)}
                                        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${showShareMenu
                                            ? 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/30'
                                            : 'text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:text-gray-500 dark:hover:text-purple-400 dark:hover:bg-purple-900/30'
                                            }`}
                                        title="导出文件"
                                    >
                                        <span className="material-icons-outlined text-[20px] leading-none">open_in_new</span>
                                    </button>

                                    {showShareMenu && (
                                        <div className="menu-panel absolute right-0 top-full mt-2 border border-gray-200 dark:border-gray-600 rounded-xl z-50 py-2 min-w-[160px]">
                                            <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 dark:text-text-tertiary">分享</div>
                                            <button
                                                onClick={handleShareLink}
                                                className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                <span className="material-icons-outlined text-lg mr-2">share</span>
                                                链接分享
                                            </button>
                                            <button
                                                onClick={handleCopyShareLink}
                                                className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                <span className="material-icons-outlined text-lg mr-2">content_copy</span>
                                                复制分享链接
                                            </button>
                                            {shareInfo.enabled && (
                                                <button
                                                    onClick={handleRevokeShareLink}
                                                    className="w-full flex items-center px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                >
                                                    <span className="material-icons-outlined text-lg mr-2">link_off</span>
                                                    关闭链接分享
                                                </button>
                                            )}
                                            <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>
                                            <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 dark:text-text-tertiary">导出</div>
                                            <button
                                                onClick={exportAsMarkdown}
                                                className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                <span className="material-icons-outlined text-lg mr-2">description</span>
                                                导出为 Markdown
                                            </button>
                                            <button
                                                onClick={exportAsText}
                                                className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                <span className="material-icons-outlined text-lg mr-2">text_snippet</span>
                                                导出为纯文本
                                            </button>
                                            {shareMessage && (
                                                <p className="px-3 py-2 text-xs text-green-600 dark:text-green-400">{shareMessage}</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                    </div>
                </div>
            </div>

            {/* 编辑区域 */}
            <div className={`${isOverlayDrawer ? 'flex-1 min-h-0 overflow-y-auto no-scrollbar px-8 pt-12 pb-28 md:px-10 md:pt-14 md:pb-32' : 'flex-1 min-h-0 overflow-y-auto px-7 pt-2 pb-[72px] md:p-0 md:pb-0'}`}>
                <div data-note-detail-content={isOverlayDrawer ? 'paper' : undefined} className={`${isOverlayDrawer ? 'note-detail-paper max-w-[680px] px-1 md:px-0 text-[#1f2a3a] dark:text-[#edf4ff]' : 'surface-card max-w-4xl bg-[#fbfcfe]/96 dark:bg-[#211d1b]/86 rounded-[28px] px-4 md:px-10 pt-4 md:pt-9 pb-6 md:pb-8'} mx-auto flex flex-col md:min-h-full`}>
                    {/* 元信息 */}
                    <div className={`${isOverlayDrawer ? 'mb-5 text-[14px] font-medium text-[#7a8494] dark:text-[#9eacbf]' : 'mb-2.5 text-sm text-gray-400 dark:text-text-tertiary'}`}>
                        {formatDate(note.updatedAt)}
                    </div>

                    {/* 虚线分隔 */}
                    <div className={`${isOverlayDrawer ? 'hidden' : 'border-b border-dashed border-gray-200 dark:border-gray-700 mb-3'}`}></div>

                    {/* TipTap 富文本编辑器 */}
                    <TipTapEditor
                        ref={editorRef}
                        content={content}
                        onUpdate={handleContentUpdate}
                        className={isOverlayDrawer ? `open-canvas-editor-content ${isMediaOnlyNote ? 'media-only-editor' : ''}` : isMediaOnlyNote ? 'media-only-editor' : ''}
                        onUploadImage={async (file) => {
                            const result = await uploadFile(file)
                            if (result?.url) {
                                window.dispatchEvent(new CustomEvent('mynote:storage-changed'))
                                return result.url
                            }
                            return null
                        }}
                        disabled={currentView === 'trash'}
                    />
                </div>
            </div>

            {uploadState.active && (
                <div className="fixed z-40 left-4 right-4 md:left-auto md:right-6 bottom-24 md:bottom-6 md:w-80 bg-white/95 dark:bg-card-dark/95 backdrop-blur border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg px-3 py-2">
                    <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300 mb-1.5 gap-2">
                        <span className="truncate">{uploadState.processing ? '服务器处理中' : '上传中'}: {uploadState.fileName}</span>
                        <span className="tabular-nums">{uploadState.progress}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                        <div
                            className="h-full bg-primary transition-all duration-150"
                            style={{ width: `${uploadState.progress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* 隐藏的文件输入 */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileUpload}
                accept="image/*"
            />

            {/* 底部悬浮工具栏 */}
            {currentView !== 'trash' && <EditorToolbar onAction={handleToolbarAction} compact={isOverlayDrawer} />}

            {/* 确认弹窗 */}
            <ConfirmDialog />

            {/* 图片预览弹窗 */}
            {previewImage && createPortal(
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={handleClosePreview}>
                    <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden relative max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={handleClosePreview}
                            className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors z-10"
                        >
                            <span className="material-icons-outlined text-lg leading-none">close</span>
                        </button>

                        <div className="p-4 overflow-y-auto flex-1">
                            <img
                                src={previewImage}
                                alt="笔记图片"
                                className="w-full rounded-xl shadow-sm"
                            />
                        </div>

                        <div className="flex border-t border-gray-100 dark:border-border-dark flex-shrink-0">
                            <button
                                onClick={handleDownloadImage}
                                className="flex-1 py-3 text-gray-600 dark:text-text-muted hover:bg-gray-50 dark:hover:bg-card-dark transition-colors font-medium flex items-center justify-center gap-1.5"
                            >
                                <span className="material-icons-outlined text-lg leading-none">download</span>
                                下载图片
                            </button>
                            <button
                                onClick={handleCopyImage}
                                className="flex-1 py-3 text-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors font-medium border-l border-gray-100 dark:border-border-dark flex items-center justify-center gap-1.5"
                            >
                                <span className="material-icons-outlined text-lg leading-none">content_copy</span>
                                复制到剪贴板
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </main>
    )
}
