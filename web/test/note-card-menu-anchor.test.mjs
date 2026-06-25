import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('首页笔记卡菜单应由 NoteList 直接持有按钮 ref，而不是透传 DOM target', async () => {
  const noteListSource = await readFile(new URL('../src/components/NoteList.jsx', import.meta.url), 'utf8')
  const previewCardSource = await readFile(new URL('../src/components/NotePreviewCard.jsx', import.meta.url), 'utf8')

  assert.equal(noteListSource.includes('noteMenuButtonRefs.current[id] = target'), false)
  assert.equal(noteListSource.includes('setNoteMenuOpen(id)'), true)
  assert.equal(noteListSource.includes('onMenuOpen(note.id, e.currentTarget)'), true)
  assert.equal(previewCardSource.includes('onMenuOpen?.(e.currentTarget)'), false)
  assert.equal(previewCardSource.includes('pointer-events-auto'), true)
  assert.equal(previewCardSource.includes('z-20'), true)
})

test('移动端笔记卡菜单应使用更紧凑的宽度与字级', async () => {
  const noteListSource = await readFile(new URL('../src/components/NoteList.jsx', import.meta.url), 'utf8')

  assert.equal(noteListSource.includes('min-w-[148px] md:min-w-[176px]'), true)
  assert.equal(noteListSource.includes('px-2 py-0.5 text-[9px] md:px-3 md:text-[10px]'), true)
  assert.equal(noteListSource.includes('px-2 py-1.5 text-[12px] md:px-2.5 md:text-[13px]'), true)
  assert.equal(noteListSource.includes('overflow-y-auto no-scrollbar'), true)
})
