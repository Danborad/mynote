import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('管理员页面关键容器应提供深色模式样式', async () => {
  const adminPageSource = await readFile(new URL('../src/components/admin/AdminPage.jsx', import.meta.url), 'utf8')
  const usersPanelSource = await readFile(new URL('../src/components/admin/AdminUsersPanel.jsx', import.meta.url), 'utf8')

  assert.equal(adminPageSource.includes('dark:text-text-main'), true)
  assert.equal(adminPageSource.includes('dark:bg-[#111925]'), true)
  assert.equal(adminPageSource.includes('dark:border-[#283445]'), true)
  assert.equal(adminPageSource.includes('dark:bg-[#0f1722]'), true)
  assert.equal(adminPageSource.includes('dark:text-[#9fb0c7]'), true)
  assert.equal(usersPanelSource.includes('dark:bg-[#111925]'), true)
  assert.equal(usersPanelSource.includes('dark:border-[#283445]'), true)
  assert.equal(usersPanelSource.includes('dark:text-text-main'), true)
  assert.equal(usersPanelSource.includes('dark:hover:bg-[#162131]'), true)
})
