import { toAbsoluteUrl } from '../api/index.js'

export function stripHtml(html) {
  if (!html) return ''
  return String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function formatCardTimestamp(dateString) {
  if (!dateString) return '-'
  const date = new Date(dateString)
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round((todayStart - dateStart) / 86400000)
  const time = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 0) return `今天 ${time}`
  if (diffDays === 1) return `昨天 ${time}`
  if (diffDays < 7) return `${diffDays}天前`
  return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}

export function extractPreviewData(html) {
  const text = stripHtml(html)
  const imgMatch = String(html || '').match(/<img[^>]+src=["']([^"']+)["']/i)
  const audioMatch = String(html || '').match(/audio-player-component|<audio\b|data-type=["']audio-player["']/i)
  const videoMatch = String(html || '').match(/video-player-component|<video\b|data-type=["']video-player["']/i)
  const imageSrc = imgMatch?.[1] ? toAbsoluteUrl(imgMatch[1]) : null
  return {
    text,
    image: imageSrc,
    audio: Boolean(audioMatch),
    video: Boolean(videoMatch),
  }
}

export function deriveDisplayTitle(note, preview) {
  const explicitTitle = String(note.title || '').trim()
  const placeholderTitles = new Set(['无标题笔记', '新建笔记'])
  if (explicitTitle && !placeholderTitles.has(explicitTitle)) return explicitTitle

  if (preview.image && !preview.text) return '图片笔记'
  if (preview.video && !preview.text) return '视频笔记'
  if (preview.audio && !preview.text) return '音频笔记'

  const firstLine = String(preview.text || '').split(/\n+/).find(Boolean)?.trim() || ''
  if (firstLine) return firstLine
  if (preview.image) return '图片笔记'
  if (preview.video) return '视频笔记'
  if (preview.audio) return '音频笔记'
  return ''
}

export function buildPreviewText(preview, displayTitle) {
  const normalized = String(preview.text || '').trim()
  if (!normalized) return ''
  if (displayTitle && normalized.startsWith(displayTitle)) {
    return normalized.slice(displayTitle.length).trim()
  }
  return normalized
}

function hexToRgb(hex) {
  const normalized = String(hex || '').trim().replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

function buildCustomColorGradient(noteColor) {
  const rgb = hexToRgb(noteColor)
  if (!rgb) return null
  return `linear-gradient(180deg, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.92) 0%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.68) 42%, rgba(39, 50, 75, 0.96) 100%)`
}

export function getCardBackgroundFromColor(noteColor, fallbackGradient, noteColors = [], tone = 'light') {
  const colorPreset = noteColors.find((item) => item.value === noteColor)
  if (colorPreset) {
    if (tone === 'dark' && colorPreset.dark) return colorPreset.dark
    if (colorPreset.light) return colorPreset.light
  }

  if (typeof noteColor === 'string' && noteColor.startsWith('#')) {
    return buildCustomColorGradient(noteColor) || fallbackGradient
  }

  return fallbackGradient
}

export function getDesktopCardTheme(note, preview, noteColors = [], isDark = false) {
  const defaultTheme = isDark
    ? 'linear-gradient(180deg, #303a52 0%, #20283b 50%, #20283b 100%)'
    : 'linear-gradient(180deg, #303a52 0%, #20283b 50%, #20283b 100%)'
  const imageTheme = isDark
    ? 'linear-gradient(180deg, #303a52 0%, #20283b 48%, #20283b 100%)'
    : 'linear-gradient(180deg, #303a52 0%, #20283b 48%, #20283b 100%)'
  const audioTheme = isDark
    ? 'linear-gradient(180deg, #2b3448 0%, #1f2940 46%, #1f2940 100%)'
    : 'linear-gradient(180deg, #2f3a52 0%, #202a40 46%, #1f2940 100%)'
  const videoTheme = isDark
    ? 'linear-gradient(180deg, #274487 0%, #1f2940 46%, #1f2940 100%)'
    : 'linear-gradient(180deg, #2f3a52 0%, #202a40 46%, #1f2940 100%)'

  const colorTone = 'dark'

  if (preview.video) {
    return {
      cardBackground: getCardBackgroundFromColor(note.color, videoTheme, noteColors, colorTone),
      mediaType: 'video',
    }
  }

  if (preview.audio) {
    return {
      cardBackground: getCardBackgroundFromColor(note.color, audioTheme, noteColors, colorTone),
      mediaType: 'audio',
    }
  }

  if (preview.image) {
    return {
      cardBackground: getCardBackgroundFromColor(note.color, imageTheme, noteColors, colorTone),
      mediaType: 'image',
    }
  }

  return {
    cardBackground: getCardBackgroundFromColor(note.color, defaultTheme, noteColors, colorTone),
    mediaType: 'default',
  }
}
