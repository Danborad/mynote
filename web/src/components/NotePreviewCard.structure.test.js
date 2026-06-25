import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('NotePreviewCard keeps legacy dark cards readable in light mode', async () => {
  const source = await readFile(new URL('./NotePreviewCard.jsx', import.meta.url), 'utf8')

  assert.ok(source.includes("const imageOverlayClass = isDark"))
  assert.ok(source.includes("'bg-gradient-to-b from-black/0 via-black/0 to-black/10'"))
  assert.ok(source.includes('const usesLegacyLightCard = !isDark'))
  assert.ok(source.includes('const usesDarkCardTone = isDark || usesLegacyLightCard'))
  assert.ok(source.includes("usesLegacyLightCard ? 'bg-[#2f3a52] border-b border-[#233049]' : 'bg-[#2b3448]'"))
  assert.equal(source.includes('imageBodyPanelClass'), false)
  assert.equal(source.includes("contentPanelClass = isDark ? '' : 'bg-white/[0.96]'"), false)
  assert.ok(source.includes("const imageContentOffsetClass = theme.mediaType === 'image' && !isDark ? 'pt-[76px]'"))
  assert.ok(source.includes("const titleClampClass = previewText ? 'line-clamp-2' : 'line-clamp-3'"))
  assert.ok(source.includes("const previewClampClass = theme.mediaType === 'image' ? 'line-clamp-1' : displayTitle?.length > 18 ? 'line-clamp-1' : 'line-clamp-2'"))
  assert.ok(source.includes('className={`relative z-[1] h-full flex flex-col ${imageContentOffsetClass} ${mediaBodyClass}`}'))
  assert.ok(source.includes('className="px-3 pt-2 pb-1 min-h-0 overflow-hidden"'))
})
