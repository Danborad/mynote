import { NodeViewWrapper } from '@tiptap/react'
import { useState, useRef, useEffect } from 'react'

export default function AudioPlayerNode({ node }) {
    const { src, filename, filesize, filedate } = node.attrs
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [contextMenu, setContextMenu] = useState(null)
    const audioRef = useRef(null)
    const containerRef = useRef(null)

    // 点击外部关闭菜单
    useEffect(() => {
        const handleClickOutside = () => setContextMenu(null)
        if (contextMenu) {
            document.addEventListener('click', handleClickOutside)
        }
        return () => document.removeEventListener('click', handleClickOutside)
    }, [contextMenu])

    // 处理右键点击
    const handleContextMenu = (e) => {
        e.preventDefault()
        e.stopPropagation()
        // 计算菜单位置（相对于视口，防止溢出暂不处理复杂逻辑，简单偏移）
        const rect = containerRef.current.getBoundingClientRect()
        setContextMenu({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        })
    }

    // 下载文件
    const handleDownload = () => {
        const a = document.createElement('a')
        a.href = src
        a.download = filename || 'download'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setContextMenu(null)
    }

    // 格式化时间 00:00
    const formatTime = (time) => {
        if (!time && time !== 0) return '00:00'
        const minutes = Math.floor(time / 60)
        const seconds = Math.floor(time % 60)
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }

    const togglePlay = () => {
        if (!audioRef.current) return
        if (isPlaying) {
            audioRef.current.pause()
        } else {
            audioRef.current.play()
        }
        setIsPlaying(!isPlaying)
    }

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime)
        }
    }

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration)
        }
    }

    const handleEnded = () => {
        setIsPlaying(false)
        setCurrentTime(0)
    }

    // 进度条点击跳转
    const handleProgressClick = (e) => {
        if (!audioRef.current || !duration) return
        const rect = e.target.getBoundingClientRect()
        const percent = (e.clientX - rect.left) / rect.width
        const newTime = percent * duration
        audioRef.current.currentTime = newTime
        setCurrentTime(newTime)
    }

    return (
        <NodeViewWrapper className="audio-player-component my-4 relative" ref={containerRef}>
            <div
                className="bg-[#f5f5f5] dark:bg-[#2c2c2e] rounded-2xl p-5 shadow-sm select-none"
                onContextMenu={handleContextMenu}
            >
                {/* 顶部：信息和播放按钮 */}
                <div className="flex items-center justify-between mb-4">
                    {/* 左侧信息 */}
                    <div className="flex-1 min-w-0 mr-4">
                        <div className="text-lg font-semibold text-gray-900 dark:text-white truncate mb-1 leading-snug">
                            {filename || '未知音频'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                            {filedate} · {filesize}
                        </div>
                    </div>

                    {/* 右侧播放按钮 */}
                    <button
                        onClick={togglePlay}
                        className="w-12 h-12 rounded-full bg-[#ff9500] hover:bg-[#ffaa33] flex items-center justify-center flex-shrink-0 transition-transform active:scale-95 shadow-md"
                        type="button"
                    >
                        {isPlaying ? (
                            <span className="material-icons-outlined text-white text-3xl">pause</span>
                        ) : (
                            <span className="material-icons-outlined text-white text-3xl ml-1">play_arrow</span>
                        )}
                    </button>
                </div>

                {/* 底部：进度条和时间 */}
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 font-mono">
                    <span className="w-10 text-right">{formatTime(currentTime)}</span>

                    {/* 进度条轨道 */}
                    <div
                        className="flex-1 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full relative cursor-pointer group"
                        onClick={handleProgressClick}
                    >
                        {/* 进度条填充 */}
                        <div
                            className="absolute left-0 top-0 h-full bg-[#333] dark:bg-white rounded-full"
                            style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                        />
                        {/* 进度滑块 (仅hover或播放时增强显示) */}
                        <div
                            className="absolute top-1/2 -mt-1.5 w-3 h-3 bg-[#333] dark:bg-white rounded-full shadow-sm transform -translate-x-1/2"
                            style={{ left: `${(currentTime / (duration || 1)) * 100}%` }}
                        />
                    </div>

                    <span className="w-10">{formatTime(duration)}</span>
                </div>

                {/* 隐藏的原生 audio 元素 */}
                <audio
                    ref={audioRef}
                    src={src}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={handleEnded}
                    className="hidden"
                />
            </div>

            {/* 右键菜单 */}
            {contextMenu && (
                <div
                    className="absolute bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 py-1 min-w-[120px]"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                    <button
                        onClick={handleDownload}
                        className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <span className="material-icons-outlined text-sm mr-2">download</span>
                        下载
                    </button>
                </div>
            )}
        </NodeViewWrapper>
    )
}