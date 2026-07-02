import { useEffect, useRef, useState } from 'react'
import { notesApi } from '../api'
import { normalizeSharedHtmlMediaUrls, resolveSharedMediaUrl } from '../utils/sharedMediaUrls.js'

export default function SharedNotePage({ token }) {
    const [note, setNote] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const articleRef = useRef(null)

    useEffect(() => {
        let mounted = true
        const load = async () => {
            try {
                setLoading(true)
                const data = await notesApi.getSharedNote(token)
                if (!mounted) return
                setNote(data)
                setError('')
            } catch (err) {
                if (!mounted) return
                setError(err.message || '分享内容加载失败')
            } finally {
                if (mounted) setLoading(false)
            }
        }
        if (token) load()
        return () => {
            mounted = false
        }
    }, [token])

    useEffect(() => {
        if (!articleRef.current || loading || error) return

        const wrappers = []
        const insertedMediaNodes = []
        const cleanupHandlers = []

        const resolveMediaUrl = (raw = '') => resolveSharedMediaUrl(raw, window.location.origin)

        const formatTime = (time) => {
            if (!time && time !== 0) return '00:00'
            const minutes = Math.floor(time / 60)
            const seconds = Math.floor(time % 60)
            return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        }

        const enhanceMediaCard = (media, playBtn, currentEl, durationEl, track, fill, thumb) => {
            const updateUI = () => {
                const duration = Number(media.duration || 0)
                const current = Number(media.currentTime || 0)
                const percent = duration > 0 ? (current / duration) * 100 : 0
                currentEl.textContent = formatTime(current)
                durationEl.textContent = formatTime(duration)
                fill.style.width = `${percent}%`
                thumb.style.left = `${percent}%`
            }

            const setPausedState = () => {
                playBtn.innerHTML = '<span class="material-icons-outlined">play_arrow</span>'
            }

            const setPlayingState = () => {
                playBtn.innerHTML = '<span class="material-icons-outlined">pause</span>'
            }

            const onTimeUpdate = () => updateUI()
            const onLoadedMeta = () => updateUI()
            const onPlay = () => setPlayingState()
            const onPause = () => setPausedState()
            const onEnded = () => setPausedState()

            media.addEventListener('timeupdate', onTimeUpdate)
            media.addEventListener('loadedmetadata', onLoadedMeta)
            media.addEventListener('play', onPlay)
            media.addEventListener('pause', onPause)
            media.addEventListener('ended', onEnded)

            playBtn.addEventListener('click', () => {
                if (media.paused) {
                    media.play().catch(() => { })
                } else {
                    media.pause()
                }
            })

            track.addEventListener('click', (event) => {
                const rect = track.getBoundingClientRect()
                const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
                if (media.duration) {
                    media.currentTime = media.duration * ratio
                }
            })

            cleanupHandlers.push(() => {
                media.pause()
                media.removeEventListener('timeupdate', onTimeUpdate)
                media.removeEventListener('loadedmetadata', onLoadedMeta)
                media.removeEventListener('play', onPlay)
                media.removeEventListener('pause', onPause)
                media.removeEventListener('ended', onEnded)
            })

            updateUI()
        }

        const buildMediaCard = (node, type) => {
            const src = resolveMediaUrl(node.getAttribute('src') || node.getAttribute('data-src') || '')
            if (!src) return null

            const filename = node.getAttribute('filename') || node.getAttribute('data-filename') || (type === 'audio' ? '音频文件' : '视频文件')
            const meta = [node.getAttribute('filedate'), node.getAttribute('filesize')].filter(Boolean).join(' · ')

            const wrap = document.createElement('div')
            wrap.className = 'shared-media-card'

            const head = document.createElement('div')
            head.className = 'shared-media-head'

            const info = document.createElement('div')
            info.className = 'shared-media-info'

            const title = document.createElement('div')
            title.className = 'shared-media-title'
            title.textContent = filename

            const subtitle = document.createElement('div')
            subtitle.className = 'shared-media-meta'
            subtitle.textContent = meta || (type === 'audio' ? '音频' : '视频')

            const playBtn = document.createElement('button')
            playBtn.type = 'button'
            playBtn.className = 'shared-media-play'
            playBtn.innerHTML = '<span class="material-icons-outlined">play_arrow</span>'

            info.appendChild(title)
            info.appendChild(subtitle)
            head.appendChild(info)
            head.appendChild(playBtn)

            wrap.appendChild(head)

            const media = document.createElement(type)
            media.src = src
            media.preload = 'metadata'

            if (type === 'video') {
                const frame = document.createElement('div')
                frame.className = 'shared-video-frame'
                media.className = 'shared-video-element'
                frame.appendChild(media)
                frame.addEventListener('click', () => {
                    if (media.paused) {
                        media.play().catch(() => { })
                    } else {
                        media.pause()
                    }
                })
                wrap.appendChild(frame)
            } else {
                media.className = 'shared-audio-element'
                wrap.appendChild(media)
            }

            const barRow = document.createElement('div')
            barRow.className = 'shared-media-bar-row'

            const currentEl = document.createElement('span')
            currentEl.className = 'shared-media-time'
            currentEl.textContent = '00:00'

            const track = document.createElement('div')
            track.className = 'shared-media-track'

            const fill = document.createElement('div')
            fill.className = 'shared-media-track-fill'

            const thumb = document.createElement('div')
            thumb.className = 'shared-media-track-thumb'

            track.appendChild(fill)
            track.appendChild(thumb)

            const durationEl = document.createElement('span')
            durationEl.className = 'shared-media-time'
            durationEl.textContent = '00:00'

            barRow.appendChild(currentEl)
            barRow.appendChild(track)
            barRow.appendChild(durationEl)
            wrap.appendChild(barRow)

            enhanceMediaCard(media, playBtn, currentEl, durationEl, track, fill, thumb)

            return wrap
        }
        const preBlocks = articleRef.current.querySelectorAll('pre')

        preBlocks.forEach((pre) => {
            if (pre.dataset.shareEnhanced === 'true') return
            pre.dataset.shareEnhanced = 'true'

            const wrapper = document.createElement('div')
            wrapper.className = 'shared-code-wrap'

            const copyBtn = document.createElement('button')
            copyBtn.type = 'button'
            copyBtn.className = 'shared-code-copy'
            copyBtn.textContent = '复制'

            copyBtn.addEventListener('click', async () => {
                const code = pre.querySelector('code')?.textContent || pre.textContent || ''
                try {
                    await navigator.clipboard.writeText(code)
                    copyBtn.textContent = '已复制'
                    setTimeout(() => {
                        copyBtn.textContent = '复制'
                    }, 1400)
                } catch {
                    const ta = document.createElement('textarea')
                    ta.value = code
                    ta.style.position = 'fixed'
                    ta.style.opacity = '0'
                    document.body.appendChild(ta)
                    ta.select()
                    document.execCommand('copy')
                    document.body.removeChild(ta)
                    copyBtn.textContent = '已复制'
                    setTimeout(() => {
                        copyBtn.textContent = '复制'
                    }, 1400)
                }
            })

            pre.parentNode?.insertBefore(wrapper, pre)
            wrapper.appendChild(copyBtn)
            wrapper.appendChild(pre)
            wrappers.push(wrapper)
        })

        const srcNodes = articleRef.current.querySelectorAll('[src]')
        srcNodes.forEach((node) => {
            const current = node.getAttribute('src')
            const next = resolveMediaUrl(current)
            if (next && next !== current) node.setAttribute('src', next)
        })

        const hrefNodes = articleRef.current.querySelectorAll('a[href]')
        hrefNodes.forEach((node) => {
            const current = node.getAttribute('href')
            const next = resolveMediaUrl(current)
            if (next && next !== current) node.setAttribute('href', next)
        })

        const audioNodes = articleRef.current.querySelectorAll('audio-player-component, [data-type="audio-player"]')
        audioNodes.forEach((node) => {
            const wrap = buildMediaCard(node, 'audio')
            if (!wrap) return
            node.replaceWith(wrap)
            insertedMediaNodes.push(wrap)
        })

        const videoNodes = articleRef.current.querySelectorAll('video-player-component, [data-type="video-player"]')
        videoNodes.forEach((node) => {
            const wrap = buildMediaCard(node, 'video')
            if (!wrap) return
            node.replaceWith(wrap)
            insertedMediaNodes.push(wrap)
        })

        return () => {
            wrappers.forEach((wrapper) => {
                const pre = wrapper.querySelector('pre')
                if (pre && wrapper.parentNode) {
                    wrapper.parentNode.insertBefore(pre, wrapper)
                }
                wrapper.remove()
            })
            cleanupHandlers.forEach((fn) => fn())
            insertedMediaNodes.forEach((n) => n.remove())
        }
    }, [note, loading, error])

    const sharedContent = normalizeSharedHtmlMediaUrls(
        note?.content || '<p>暂无内容</p>',
        typeof window !== 'undefined' ? window.location.origin : '',
    )

    return (
        <div className="app-shell min-h-screen text-gray-900 dark:text-text-main px-4 py-6 md:px-8">
            <div className="mx-auto max-w-3xl">
                <header className="mb-4 md:mb-6">
                    <div className="inline-flex items-end gap-0.5 select-none">
                        <span className="text-3xl font-black bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 bg-clip-text text-transparent tracking-tight">
                            My
                        </span>
                        <span className="text-3xl font-light text-gray-700 dark:text-text-main tracking-tight">
                            Note
                        </span>
                    </div>
                </header>

                <div className="frosted-panel rounded-2xl border border-white/70 dark:border-border-dark/70 p-5 md:p-8">
                    {loading && (
                        <div className="py-10 text-center text-gray-500">加载中...</div>
                    )}

                    {!loading && error && (
                        <div className="py-10 text-center text-red-500">{error}</div>
                    )}

                    {!loading && !error && (
                        <>
                            <h1 className="mb-6 text-[28px] font-semibold leading-tight text-[#172033] dark:text-text-main md:text-[34px]">
                                {note?.title || '未命名分享'}
                            </h1>
                            <article
                                ref={articleRef}
                                className="shared-note-content prose prose-lg dark:prose-invert max-w-none"
                                dangerouslySetInnerHTML={{ __html: sharedContent }}
                            />
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
