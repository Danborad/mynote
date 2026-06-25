import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('NoteList 在已有笔记时不应因 loading 而替换成整页加载占位', async () => {
  const source = await readFile(new URL('../src/components/NoteList.jsx', import.meta.url), 'utf8')

  assert.equal(source.includes('loading && visibleNotes.length === 0'), true)
  assert.equal(source.includes("加载中..."), true)
})
