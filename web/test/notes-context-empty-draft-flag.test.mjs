import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('NotesContext 的 createNote 应恢复为真正创建后再选中真实笔记', async () => {
  const source = await readFile(new URL('../src/contexts/NotesContext.jsx', import.meta.url), 'utf8')

  assert.equal(source.includes('const isPendingEmptyDraft'), false)
  assert.equal(source.includes('_pendingEmptyDraft'), false)
  assert.equal(source.includes('const discardNoteDraft = async (id) => {'), false)
  assert.equal(source.includes("title: data.title || '无标题笔记'"), true)
  assert.equal(source.includes('setNotes(prev => sortNotesByPinAndTime([newNote, ...prev]))'), true)
  assert.equal(source.includes('setSelectedNote(newNote)'), true)
})
