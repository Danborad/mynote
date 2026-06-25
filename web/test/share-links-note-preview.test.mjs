import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('分享链接列表项应包含笔记卡片预览所需的数据与结构', async () => {
  const serviceSource = await readFile(new URL('../../api/src/notes/notes.service.ts', import.meta.url), 'utf8')
  const pageSource = await readFile(new URL('../src/components/ShareLinksPage.jsx', import.meta.url), 'utf8')
  const noteListSource = await readFile(new URL('../src/components/NoteList.jsx', import.meta.url), 'utf8')

  assert.equal(serviceSource.includes("select: ['id', 'title', 'content', 'shareToken', 'sharedAt', 'updatedAt']"), true)
  assert.equal(serviceSource.includes('content: note.content'), true)
  assert.equal(pageSource.includes('useNotes()'), true)
  assert.equal(pageSource.includes('const linkedNote = notes.find((note) => note.id === item.id)'), true)
  assert.equal(pageSource.includes('<NotePreviewCard'), true)
  assert.equal(noteListSource.includes('<NotePreviewCard'), true)
  assert.equal(pageSource.includes('compact'), false)
  assert.equal(pageSource.includes('w-[74px] h-[84px] overflow-hidden flex-shrink-0'), true)
  assert.equal(pageSource.includes('w-[148px] h-[168px] origin-top-left scale-50'), true)
})
