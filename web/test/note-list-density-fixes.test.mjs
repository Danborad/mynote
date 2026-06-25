import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('首页卡片应为更密的桌面网格并移除底部分割线', async () => {
  const noteList = await readFile(new URL('../src/components/NoteList.jsx', import.meta.url), 'utf8')
  const css = await readFile(new URL('../src/index.css', import.meta.url), 'utf8')

  assert.equal(noteList.includes('grid grid-cols-2 gap-1.5 auto-rows-fr w-full expanded-note-board'), true)
  assert.equal(noteList.includes('hidden md:block w-full overflow-x-auto no-scrollbar pb-3 px-3 pt-5'), true)
  assert.equal(noteList.includes('border-t border-white/8'), false)
  assert.equal(noteList.includes("hasMediaHeader ? 'pt-[82px]' : 'pt-[40px] md:pt-[37px]'"), true)
  assert.equal(css.includes('grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));'), true)
  assert.equal(css.includes('gap: 5px;'), true)
  assert.equal(css.includes('height: 168px;'), true)
})
