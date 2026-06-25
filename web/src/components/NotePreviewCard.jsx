import { extractPreviewData, deriveDisplayTitle, buildPreviewText, getDesktopCardTheme, formatCardTimestamp } from '../utils/noteCardPreview'
import { NOTE_COLORS } from '../utils/noteColorBehavior.js'
import { useTheme } from '../contexts/ThemeContext'

export default function NotePreviewCard({ note, onMenuOpen = null, menuButtonRef = null }) {
  const { isDark } = useTheme()
  const preview = extractPreviewData(note.content)
  const displayTitle = deriveDisplayTitle(note, preview)
  const previewText = buildPreviewText(preview, displayTitle)
  const theme = getDesktopCardTheme(note, preview, NOTE_COLORS, isDark)
  const hasMediaHeader = theme.mediaType !== 'default'
  const usesLegacyLightCard = !isDark
  const usesDarkCardTone = isDark || usesLegacyLightCard
  const cardShellClass = usesDarkCardTone ? 'desktop-note-card-media border-[#2b3448] text-white' : 'text-[#1f2a3d]'
  const cardBorder = usesDarkCardTone ? '#2b3448' : '#dbe4f0'
  const cardTextClass = usesDarkCardTone ? 'text-white' : 'text-[#1f2a3d]'
  const menuButtonClass = usesDarkCardTone
    ? 'text-white/70 hover:text-white hover:bg-white/10'
    : 'text-[#6f7b8e] hover:text-[#1f2a3d] hover:bg-[#dfe7f2]'
  const imageOverlayClass = isDark
    ? 'bg-gradient-to-b from-black/10 via-black/12 to-[#20283b]/70'
    : 'bg-gradient-to-b from-black/0 via-black/0 to-black/10'
  const mediaHeaderClass = 'absolute inset-x-0 top-0 z-[2] h-[76px] flex items-center justify-center'
  const mediaIconContainerClass = usesLegacyLightCard ? 'bg-[#2f3a52] border-b border-[#233049]' : 'bg-[#2b3448]'
  const mediaIconSizeClass = usesLegacyLightCard ? 'text-[32px]' : 'w-11 h-11 text-[32px] bg-white/10 border border-white/10'
  const mediaIconClass = usesLegacyLightCard ? 'text-white/95' : 'text-white'
  const previewTextClass = usesDarkCardTone ? 'text-white/76' : 'text-[#5f6c80]'
  const metaTextClass = usesDarkCardTone ? 'text-white/72' : 'text-[#657287]'
  const favoriteClass = isDark ? 'text-[#ffccaa]' : 'text-[#f59e7a]'
  const mediaBodyClass = isDark || usesLegacyLightCard || theme.mediaType === 'image' ? '' : 'bg-white/[0.96]'
  const imageContentOffsetClass = theme.mediaType === 'image' && !isDark ? 'pt-[76px]' : hasMediaHeader ? 'pt-[82px]' : 'pt-[40px] md:pt-[37px]'
  const titleClampClass = previewText ? 'line-clamp-2' : 'line-clamp-3'
  const previewClampClass = theme.mediaType === 'image' ? 'line-clamp-1' : displayTitle?.length > 18 ? 'line-clamp-1' : 'line-clamp-2'

  return (
    <div className={`relative h-full rounded-[14px] overflow-hidden border cursor-pointer transition-all duration-200 ${cardShellClass} ${cardTextClass}`} style={{ background: theme.cardBackground, borderColor: cardBorder }}>
        <button
          type="button"
          ref={menuButtonRef}
          onClick={(e) => {
            e.stopPropagation()
            onMenuOpen?.(e)
          }}
          className={`absolute top-2 right-2 z-20 w-5 h-5 rounded-full pointer-events-auto flex items-center justify-center ${menuButtonClass}`}
        >
        <span className="material-icons-outlined text-[15px]">more_horiz</span>
      </button>

      {theme.mediaType === 'image' ? (
        <div className="absolute inset-x-0 top-0 h-[76px] overflow-hidden">
          <img src={preview.image} alt={note.title || '封面'} className="w-full h-full object-cover" />
          <div className={`absolute inset-0 ${imageOverlayClass}`} />
        </div>
      ) : null}

      {theme.mediaType === 'audio' ? (
        <div className={`${mediaHeaderClass} ${mediaIconContainerClass}`}>
          <span className={`${mediaIconSizeClass} rounded-[14px] flex items-center justify-center material-icons-outlined leading-none ${mediaIconClass}`}>music_note</span>
        </div>
      ) : null}

      {theme.mediaType === 'video' ? (
        <div className={`${mediaHeaderClass} ${mediaIconContainerClass}`}>
          <span className={`${mediaIconSizeClass} rounded-[14px] flex items-center justify-center material-icons-outlined leading-none ${mediaIconClass}`}>movie</span>
        </div>
      ) : null}

      <div className={`relative z-[1] h-full flex flex-col ${imageContentOffsetClass} ${mediaBodyClass}`}>
        <div className="px-3 pt-2 pb-1 min-h-0 overflow-hidden">
          {displayTitle ? <h3 className={`text-[12px] font-semibold leading-[1.28] ${titleClampClass}`}>{displayTitle}</h3> : null}
          {previewText ? (
            <p className={`mt-0.5 text-[9px] leading-[1.3] ${previewClampClass} break-all ${previewTextClass}`}>{previewText}</p>
          ) : null}
        </div>
        <div className={`mt-auto px-3 pt-1 pb-1 flex items-center justify-between text-[9px] ${metaTextClass}`}>
          <div className="flex items-center gap-1 min-w-0">
            <span className="material-icons-outlined text-[11px]">schedule</span>
            <span className="truncate">{formatCardTimestamp(note.updatedAt || note.createdAt)}</span>
          </div>
          {note.isFavorite ? <span className={`material-icons-outlined text-[12px] ${favoriteClass}`}>favorite</span> : null}
        </div>
      </div>
    </div>
  )
}
