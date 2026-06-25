import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('首页、收藏夹和废纸篓应共享同一套桌面卡片网格约束', async () => {
  const source = await readFile(new URL('../src/components/NoteList.jsx', import.meta.url), 'utf8')
  const css = await readFile(new URL('../src/index.css', import.meta.url), 'utf8')

  assert.equal(source.includes('grid grid-cols-2 gap-1.5 auto-rows-fr w-full expanded-note-board'), true)
  assert.equal(source.includes('md:grid-cols-2'), false)
  assert.equal(css.includes('grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));'), true)
  assert.equal(css.includes('min-height: 120px;'), false)
  assert.equal(css.includes('height: 168px;'), true)
})
