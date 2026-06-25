import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('MobileHeader defines dark-mode styles for mobile top bar', async () => {
  const source = await readFile(new URL('./MobileHeader.jsx', import.meta.url), 'utf8')

  assert.ok(source.includes('dark:bg-[#111925]'))
  assert.ok(source.includes('dark:border-[#243244]'))
  assert.ok(source.includes('dark:text-[#a8b4c2]'))
  assert.ok(source.includes('dark:text-[#7f8da3]'))
  assert.ok(source.includes('dark:bg-[#2563eb]'))
  assert.ok(source.includes('dark:bg-[#182331]'))
})

test('MobileHeader only shows folder tabs on all-notes and folder views', async () => {
  const source = await readFile(new URL('./MobileHeader.jsx', import.meta.url), 'utf8')

  assert.ok(source.includes("const shouldShowMobileTabs = currentView === 'all' || currentView === 'folder'"))
  assert.ok(source.includes('{shouldShowMobileTabs && ('))
})
