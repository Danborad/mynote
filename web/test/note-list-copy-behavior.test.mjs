import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('NoteList 不应再展示无标题笔记兜底文案', async () => {
  const source = await readFile(new URL('../src/components/NoteList.jsx', import.meta.url), 'utf8')

  assert.equal(source.includes('无标题笔记'), false)
  assert.equal(source.includes('图片笔记'), true)
  assert.equal(source.includes('音频笔记'), true)
  assert.equal(source.includes('视频笔记'), true)
  assert.equal(source.includes('新建笔记'), false)
})

test('NoteList 应避免标题和摘要重复显示首行内容', async () => {
  const source = await readFile(new URL('../src/components/NoteList.jsx', import.meta.url), 'utf8')

  assert.equal(source.includes('deriveDisplayTitle'), true)
  assert.equal(source.includes('buildPreviewText'), true)
  assert.equal(source.includes('normalized.startsWith(displayTitle)'), true)
  assert.equal(source.includes("slice(displayTitle.length).trim()"), true)
})
