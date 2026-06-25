import { useEditor, EditorContent, ReactNodeViewRenderer } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Node, mergeAttributes } from '@tiptap/core'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import { useEffect, forwardRef, useImperativeHandle } from 'react'
import CodeBlockNode from './CodeBlockNode'

const lowlight = createLowlight(common)
import { getToken, apiUrl, isSyncModeEnabled } from '../api'
import AudioPlayerNode from './AudioPlayerNode'
import VideoPlayerNode from './VideoPlayerNode'

const isEmptyContent = (html = '') => {
    const text = String(html)
        .replace(/<br\s*\/?>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/gi, '')
        .trim()
    return text.length === 0 && !/<(img|audio-player-component|video-player-component)\b/i.test(String(html))
}

// 自定义音频播放器节点 - 使用 React 组件渲染
const AudioPlayer = Node.create({
    name: 'audioPlayer',
    group: 'block',
    atom: true,
    addAttributes() {
        return {
            src: { default: null },
            filename: { default: '' },
            filesize: { default: '' },
            filedate: { default: '' },
        }
    },
    parseHTML() {
        return [{
            tag: 'audio-player-component'
        }]
    },
    renderHTML({ HTMLAttributes }) {
        return ['audio-player-component', mergeAttributes(HTMLAttributes)]
    },
    addNodeView() {
        return ReactNodeViewRenderer(AudioPlayerNode)
    },
})

// 自定义视频播放器节点 - 使用 React 组件渲染
const VideoPlayer = Node.create({
    name: 'videoPlayer',
    group: 'block',
    atom: true,
    addAttributes() {
        return {
            src: { default: null },
            filename: { default: '' },
            filesize: { default: '' },
            filedate: { default: '' },
        }
    },
    parseHTML() {
        return [{
            tag: 'video-player-component'
        }]
    },
    renderHTML({ HTMLAttributes }) {
        return ['video-player-component', mergeAttributes(HTMLAttributes)]
    },
    addNodeView() {
        return ReactNodeViewRenderer(VideoPlayerNode)
    },
})

// 上传图片到服务器
const defaultUploadImage = async (file) => {
    if (!isSyncModeEnabled()) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result)
            reader.onerror = () => reject(new Error('本地图片读取失败'))
            reader.readAsDataURL(file)
        })
    }

    const formData = new FormData()
    formData.append('file', file)
    const token = getToken()

    try {
        const response = await fetch(apiUrl('/files/upload'), {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        })

        if (!response.ok) throw new Error('Upload failed')
        const data = await response.json()
        window.dispatchEvent(new CustomEvent('mynote:storage-changed'))
        return String(data?.url || '')
            .replace(/^https?:\/\/[^/]+\/api\/uploads\//i, '/uploads/')
            .replace(/^https?:\/\/[^/]+\/uploads\//i, '/uploads/')
            .replace(/^\/?api\/uploads\//i, '/uploads/')
            .replace(/^uploads\//i, '/uploads/')
    } catch (error) {
        console.error('Image upload error:', error)
        return null
    }
}

const TipTapEditor = forwardRef(({ content, onUpdate, disabled, className, onUploadImage }, ref) => {
    const uploadImage = onUploadImage || defaultUploadImage
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: false, // Disable headings for simple note-taking
                codeBlock: false, // 禁用默认的 codeBlock，使用 lowlight 替代
            }),
            CodeBlockLowlight.extend({
                addNodeView() {
                    return ReactNodeViewRenderer(CodeBlockNode)
                },
            }).configure({
                lowlight,
            }),
            Underline,
            Image.configure({
                inline: true,
                allowBase64: true, // 允许 base64 作为临时显示
            }),
            Placeholder.configure({
                placeholder: '开始写点什么...',
                emptyEditorClass: 'is-editor-empty',
            }),
            TaskList,
            TaskItem.configure({
                nested: true,
            }),
            AudioPlayer,
            VideoPlayer,
        ],
        content: content || '',
        editable: !disabled,
        onUpdate: ({ editor }) => {
            if (onUpdate) {
                onUpdate(editor.getHTML())
            }
        },
        editorProps: {
            attributes: {
                class: 'prose prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[300px] ' + (className || ''),
            },
            handleClick: (view, pos, event) => {
                const target = event.target
                if (target instanceof Element && target.closest('a')) {
                    event.preventDefault()
                    return true
                }
                return false
            },
            // 处理粘贴事件
            handlePaste: (view, event) => {
                const items = event.clipboardData?.items
                if (!items) return false

                for (const item of items) {
                    if (item.type.startsWith('image/')) {
                        event.preventDefault()
                        const file = item.getAsFile()
                        if (file) {
                            // 上传图片
                            uploadImage(file).then(url => {
                                if (url && view.state.tr) {
                                    // 插入图片
                                    const { schema } = view.state
                                    const node = schema.nodes.image.create({ src: url })
                                    const transaction = view.state.tr.replaceSelectionWith(node)
                                    view.dispatch(transaction)
                                }
                            })
                        }
                        return true
                    }
                }
                return false
            },
            // 处理拖放事件
            handleDrop: (view, event) => {
                const files = event.dataTransfer?.files
                if (!files || files.length === 0) return false

                const file = files[0]
                if (file.type.startsWith('image/')) {
                    event.preventDefault()
                    uploadImage(file).then(url => {
                        if (url && view.state.tr) {
                            const { schema } = view.state
                            const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY })
                            const node = schema.nodes.image.create({ src: url })
                            const transaction = view.state.tr.insert(coordinates?.pos || 0, node)
                            view.dispatch(transaction)
                        }
                    })
                    return true
                }
                return false
            },
        },
    })

    // Expose editor methods to parent
    useImperativeHandle(ref, () => ({
        getEditor: () => editor,
        getHTML: () => editor?.getHTML() || '',
        setContent: (newContent) => editor?.commands.setContent(newContent),
        focus: () => editor?.commands.focus(),
        // Format commands
        toggleBold: () => editor?.chain().focus().toggleBold().run(),
        toggleItalic: () => editor?.chain().focus().toggleItalic().run(),
        toggleUnderline: () => editor?.chain().focus().toggleUnderline().run(),
        toggleBulletList: () => editor?.chain().focus().toggleBulletList().run(),
        toggleTaskList: () => editor?.chain().focus().toggleTaskList().run(),
        toggleCodeBlock: () => editor?.chain().focus().toggleCodeBlock().run(),
        insertImage: (src) => {
            if (!editor) return false
            const inserted = editor.chain().focus().setImage({ src }).run()
            if (inserted) return true
            return editor.chain().focus('end').insertContent(`<p></p><img src="${src}" /><p></p>`).run()
        },
        insertFileLink: (url, fileName, fileSize, fileExt, mimeType) => {
            const dateStr = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric' })

            // 根据文件类型生成不同的HTML
            if (mimeType?.startsWith('audio/')) {
                // 音频文件 - 使用自定义节点
                const attrs = {
                    src: url,
                    filename: fileName || '未知音频',
                    filesize: fileSize || '0 B',
                    filedate: dateStr
                }
                console.log('Inserting audio player with attrs:', attrs)
                editor?.chain().focus().insertContent({
                    type: 'audioPlayer',
                    attrs: attrs
                }).run()
            } else if (mimeType?.startsWith('video/')) {
                // 视频文件 - 使用自定义节点
                const attrs = {
                    src: url,
                    filename: fileName || '未知视频',
                    filesize: fileSize || '0 B',
                    filedate: dateStr
                }
                editor?.chain().focus().insertContent({
                    type: 'videoPlayer',
                    attrs: attrs
                }).run()
            } else {
                // 其他文件 - 使用简单的链接
                editor?.chain().focus().insertContent(`<p><a href="${url}" download="${fileName}">${fileName}</a></p>`).run()
            }
        },
        replaceMediaUrl: (fromUrl, toUrl) => {
            if (!editor || !fromUrl || !toUrl) return false
            let tr = editor.state.tr
            let changed = false

            editor.state.doc.descendants((node, pos) => {
                if ((node.type.name === 'image' || node.type.name === 'audioPlayer' || node.type.name === 'videoPlayer') && node.attrs?.src === fromUrl) {
                    tr = tr.setNodeMarkup(pos, undefined, { ...node.attrs, src: toUrl })
                    changed = true
                }
                return true
            })

            if (changed) {
                editor.view.dispatch(tr)
                return true
            }

            const html = editor.getHTML()
            if (!html.includes(fromUrl)) return false
            editor.commands.setContent(html.split(fromUrl).join(toUrl))
            return true
        },
        removeMediaByUrl: (targetUrl) => {
            if (!editor || !targetUrl) return false
            let tr = editor.state.tr
            const removals = []

            editor.state.doc.descendants((node, pos) => {
                if ((node.type.name === 'image' || node.type.name === 'audioPlayer' || node.type.name === 'videoPlayer') && node.attrs?.src === targetUrl) {
                    removals.push({ from: pos, to: pos + node.nodeSize })
                }
                return true
            })

            if (removals.length === 0) return false

            removals.sort((a, b) => b.from - a.from).forEach(({ from, to }) => {
                tr = tr.delete(from, to)
            })

            editor.view.dispatch(tr)
            return true
        },
    }))

    // Update content when prop changes (e.g., switching notes)
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content || '')
        }
    }, [content, editor])

    // Update editable state
    useEffect(() => {
        if (editor) {
            editor.setEditable(!disabled)
        }
    }, [disabled, editor])

    useEffect(() => {
        if (!editor || disabled || !isEmptyContent(content)) return
        requestAnimationFrame(() => {
            editor.commands.focus('end')
        })
    }, [content, disabled, editor])

    if (!editor) {
        return null
    }

    return (
        <EditorContent
            editor={editor}
            className={`w-full md:flex-1 text-gray-700 dark:text-text-main leading-relaxed ${className || ''}`}
        />
    )
})

TipTapEditor.displayName = 'TipTapEditor'

export default TipTapEditor
