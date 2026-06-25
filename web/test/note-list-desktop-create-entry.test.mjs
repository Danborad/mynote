import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('桌面端列表顶部应保留新建笔记入口', async () => {
  const source = await readFile(new URL('../src/components/NoteList.jsx', import.meta.url), 'utf8')

  assert.equal(source.includes('hidden md:flex w-full items-center justify-between gap-3 pb-3 px-3 pt-5'), true)
  assert.equal(source.includes("currentView === 'trash' ? ("), true)
  assert.equal(source.includes('onClick={onCreateNote}'), true)
  assert.equal(source.includes('onClick={() => onCreateNote({ title: \'\', content: \'\' })}'), false)
  assert.equal(source.includes('absolute right-6 bottom-6 z-20 hidden md:flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2563eb] text-white'), true)
  assert.equal(source.includes('<span className="material-icons-outlined">add</span>'), true)
})
