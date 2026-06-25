import { useState } from 'react'
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react'

export default function CodeBlockNode({ node, editor, getPos }) {
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        const code = node.textContent
        try {
            await navigator.clipboard.writeText(code)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            const ta = document.createElement('textarea')
            ta.value = code
            ta.style.position = 'fixed'
            ta.style.opacity = '0'
            document.body.appendChild(ta)
            ta.select()
            document.execCommand('copy')
            document.body.removeChild(ta)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    // 在代码块上方插入一个空段落
    const handleInsertAbove = () => {
        if (!editor || typeof getPos !== 'function') return
        const pos = getPos()
        editor
            .chain()
            .focus()
            .insertContentAt(pos, { type: 'paragraph' })
            .setTextSelection(pos)
            .run()
    }

    return (
        <NodeViewWrapper className="relative group my-4">
            {/* 在上方插入按钮：hover 时在代码块顶部居中显示 */}
            <button
                onClick={handleInsertAbove}
                contentEditable={false}
                className="
                    absolute -top-3.5 left-1/2 -translate-x-1/2 z-10
                    w-7 h-7 rounded-full flex items-center justify-center
                    bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-300
                    hover:bg-primary hover:text-white
                    transition-all duration-200 select-none
                    opacity-0 group-hover:opacity-100 shadow-sm
                "
                title="在上方插入段落"
            >
                <span className="material-icons-outlined" style={{ fontSize: '16px', lineHeight: 1 }}>add</span>
            </button>

            {/* 复制按钮：hover 时在右上角显示 */}
            <button
                onClick={handleCopy}
                contentEditable={false}
                className={`
                    absolute top-2.5 right-2.5 z-10
                    flex items-center gap-1 px-2 py-1 rounded-md text-xs font-mono
                    transition-all duration-200 select-none
                    ${copied
                        ? 'bg-green-600 text-white opacity-100'
                        : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white opacity-0 group-hover:opacity-100'
                    }
                `}
                title="复制代码"
            >
                {copied ? (
                    <>
                        <span className="material-icons-outlined" style={{ fontSize: '14px', lineHeight: 1 }}>check</span>
                        已复制
                    </>
                ) : (
                    <>
                        <span className="material-icons-outlined" style={{ fontSize: '14px', lineHeight: 1 }}>content_copy</span>
                    </>
                )}
            </button>

            {/* 代码内容 */}
            <pre className="!my-0">
                <NodeViewContent as="code" />
            </pre>
        </NodeViewWrapper>
    )
}
