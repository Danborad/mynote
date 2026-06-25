import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('桌面卡片网格应允许拉伸填满剩余宽度且卡片尺寸不应过小', async () => {
  const source = await readFile(new URL('../src/components/NoteList.jsx', import.meta.url), 'utf8')
  const css = await readFile(new URL('../src/index.css', import.meta.url), 'utf8')

  assert.equal(source.includes('h-[120px]'), true)
  assert.equal(source.includes('h-[76px] overflow-hidden'), true)
  assert.equal(source.includes("hasMediaHeader ? 'pt-[82px]' : 'pt-[40px] md:pt-[37px]'"), true)
  assert.equal(css.includes('grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));'), true)
  assert.equal(css.includes('justify-content: start;'), false)
  assert.equal(css.includes('min-height: 120px;'), false)
  assert.equal(css.includes('height: 168px;'), true)
})
