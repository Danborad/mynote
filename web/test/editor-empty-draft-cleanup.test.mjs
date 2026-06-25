import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('编辑器应支持前端空白草稿，并在首次输入后才创建真实笔记', async () => {
  const source = await readFile(new URL('../src/components/Editor.jsx', import.meta.url), 'utf8')

  assert.equal(source.includes('const isDraftNote = !note?.id'), true)
  assert.equal(source.includes('const hasMeaningfulDraftContent = (html = \'\') => {'), true)
  assert.equal(source.includes('if (!note || currentView === \'trash\' || isDraftNote) return'), true)
  assert.equal(source.includes('const created = await createNote({ title: newTitle, content })'), true)
  assert.equal(source.includes('setSelectedNote(created)'), true)
  assert.equal(source.includes('if (!isDraftNote || !hasMeaningfulDraftContent(content)) return'), true)
  assert.equal(source.includes("onClick={() => createNote({ title: '', content: '' })}"), false)
})
