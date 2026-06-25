import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('移动端列表应缩小底部占位并压紧卡片间距与高度', async () => {
  const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')
  const noteListSource = await readFile(new URL('../src/components/NoteList.jsx', import.meta.url), 'utf8')
  const dockSource = await readFile(new URL('../src/components/MobileDock.jsx', import.meta.url), 'utf8')
  const cssSource = await readFile(new URL('../src/index.css', import.meta.url), 'utf8')

  assert.equal(appSource.includes("pb-0 md:pb-0"), true)
  assert.equal(appSource.includes("currentView === 'settings' ? 'flex md:hidden' : 'hidden'} flex-col flex-1 min-h-0 pb-0 md:pb-0"), true)
  assert.equal(appSource.includes("currentView === 'shares' ? 'flex md:hidden' : 'hidden'} flex-col flex-1 min-h-0 pb-0 md:pb-0"), true)
  assert.equal(dockSource.includes('bottom-[calc(12px+env(safe-area-inset-bottom))]'), true)
  assert.equal(noteListSource.includes('grid grid-cols-2 gap-2.5 auto-rows-fr w-full expanded-note-board'), true)
  assert.equal(noteListSource.includes('columns-2 gap-2.5 w-full md:grid md:gap-3 expanded-note-board'), false)
  assert.equal(noteListSource.includes('mb-2.5 break-inside-avoid'), false)
  assert.equal(noteListSource.includes('mobile-list-fade'), false)
  assert.equal(noteListSource.includes('px-3 pt-3 pb-0 md:px-3 md:pb-4'), true)
  assert.equal(cssSource.includes('padding-top: calc(env(safe-area-inset-top, 0px) + 10px);'), false)
  assert.equal(noteListSource.includes("h-[132px]"), true)
})
