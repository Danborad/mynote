import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('移动端笔记列表应具备设计稿所需的紧凑顶栏、横向标签栏、双列卡片和蓝色 FAB', async () => {
  const headerSource = await readFile(new URL('../src/components/MobileHeader.jsx', import.meta.url), 'utf8')
  const noteListSource = await readFile(new URL('../src/components/NoteList.jsx', import.meta.url), 'utf8')
  const dockSource = await readFile(new URL('../src/components/MobileDock.jsx', import.meta.url), 'utf8')

  assert.equal(headerSource.includes('My'), true)
  assert.equal(headerSource.includes('Note'), true)
  assert.equal(headerSource.includes('Settings Center'), true)
  assert.equal(headerSource.includes('px-4 pt-[max(18px,env(safe-area-inset-top))] pb-0'), true)
  assert.equal(noteListSource.includes('grid grid-cols-2 gap-2.5 auto-rows-fr w-full expanded-note-board'), true)
  assert.equal(noteListSource.includes('break-inside-avoid'), false)
  assert.equal(noteListSource.includes('getMobileCardHeightClass'), false)
  assert.equal(noteListSource.includes('h-[132px] md:h-full'), true)
  assert.equal(noteListSource.includes('bg-white min-h-[132px]'), false)
  assert.equal(noteListSource.includes('text-white/76'), false)
  assert.equal(noteListSource.includes('line-clamp-3'), false)
  assert.equal(noteListSource.includes('rounded-[18px]'), true)
  assert.equal(noteListSource.includes('紧凑列表'), false)
  assert.equal(noteListSource.includes("md:hidden w-full overflow-x-auto no-scrollbar px-3 pt-2 pb-3"), false)
  assert.equal(dockSource.includes('right-5 bottom-[calc(12px+env(safe-area-inset-bottom))]'), true)
  assert.equal(dockSource.includes('h-14 w-14 rounded-full bg-[#2563eb]'), true)
})

test('桌面和移动端分组栏都应保留创建分组入口', async () => {
  const headerSource = await readFile(new URL('../src/components/MobileHeader.jsx', import.meta.url), 'utf8')
  const noteListSource = await readFile(new URL('../src/components/NoteList.jsx', import.meta.url), 'utf8')

  assert.equal(noteListSource.includes('创建分组'), true)
  assert.equal(noteListSource.includes('material-icons-outlined">add</span>'), true)
  assert.equal(headerSource.includes('创建分组'), true)
  assert.equal(headerSource.includes('material-icons-outlined text-[18px] leading-none">add</span>'), true)
})
