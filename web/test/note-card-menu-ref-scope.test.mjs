import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('NoteCard 不应直接闭包引用 NoteList 内部 noteMenuButtonRefs，而应通过 props 传入', async () => {
  const source = await readFile(new URL('../src/components/NoteList.jsx', import.meta.url), 'utf8')

  assert.equal(source.includes('function NoteCard({ note, selected, folderLabel, onOpen, onMenuOpen, isSelectionMode, toggleNoteSelection, consumeLongPressClick, noteMenuButtonRefs })'), true)
  assert.equal(source.includes('menuButtonRef={(node) => { noteMenuButtonRefs.current[note.id] = node }}'), true)
})

test('NoteCard 不应同时渲染两份共享卡片去竞争同一个菜单按钮 ref', async () => {
  const source = await readFile(new URL('../src/components/NoteList.jsx', import.meta.url), 'utf8')

  assert.equal(source.includes('<div className="md:hidden">'), false)
  assert.equal(source.includes('<div className="hidden md:block h-full">'), false)
  assert.equal(source.includes('<NotePreviewCard note={note} menuButtonRef={(node) => { noteMenuButtonRefs.current[note.id] = node }}'), true)
})
