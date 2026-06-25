import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('管理员模式应使用后台专属移动端顶栏而不是笔记工作区顶栏', async () => {
  const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')

  assert.equal(appSource.includes('function AdminMobileHeader'), true)
  assert.equal(appSource.includes('<AdminMobileHeader'), true)
  assert.equal(appSource.includes('Settings Center'), false)
  assert.equal(appSource.includes('onSearchOpen={() => {}}'), false)
})

test('管理员页应有真实搜索、筛选和分页状态', async () => {
  const adminPageSource = await readFile(new URL('../src/components/admin/AdminPage.jsx', import.meta.url), 'utf8')

  assert.equal(adminPageSource.includes('const [searchQuery, setSearchQuery]'), true)
  assert.equal(adminPageSource.includes('const [statusFilter, setStatusFilter]'), true)
  assert.equal(adminPageSource.includes('const [currentPage, setCurrentPage]'), true)
  assert.equal(adminPageSource.includes('filteredUsers'), true)
  assert.equal(adminPageSource.includes('pagedUsers'), true)
  assert.equal(adminPageSource.includes('aria-label="搜索用户"'), true)
  assert.equal(adminPageSource.includes('grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[0.9fr_0.9fr_1.2fr]'), true)
  assert.equal(adminPageSource.includes('+12% trending_up'), false)
  assert.equal(adminPageSource.includes('本月新增'), false)
})

test('管理员用户面板应避免移动端裁切并提供真实表格操作', async () => {
  const usersPanelSource = await readFile(new URL('../src/components/admin/AdminUsersPanel.jsx', import.meta.url), 'utf8')

  assert.equal(usersPanelSource.includes('onStatusFilterChange'), true)
  assert.equal(usersPanelSource.includes('handleExportUsersCsv'), true)
  assert.equal(usersPanelSource.includes('handlePrintUsers'), true)
  assert.equal(usersPanelSource.includes('overflow-x-auto'), true)
  assert.equal(usersPanelSource.includes('min-w-[1064px]'), true)
  assert.equal(usersPanelSource.includes('md:hidden'), true)
  assert.equal(usersPanelSource.includes('用户卡片列表'), true)
  assert.equal(usersPanelSource.includes('第 {currentPage} / {pageCount} 页'), true)
  assert.equal(usersPanelSource.includes('第 1 / 49 页'), false)
  assert.equal(usersPanelSource.includes('analytics'), false)
})

test('管理员账号表单应使用安全密码输入和可访问标签', async () => {
  const adminPageSource = await readFile(new URL('../src/components/admin/AdminPage.jsx', import.meta.url), 'utf8')

  assert.equal(adminPageSource.includes('htmlFor="new-user-password"'), true)
  assert.equal(adminPageSource.includes('id="new-user-password"'), true)
  assert.equal(adminPageSource.includes('type="password"'), true)
  assert.equal(adminPageSource.includes('autoComplete="new-password"'), true)
  assert.equal(adminPageSource.includes('role="dialog"'), true)
  assert.equal(adminPageSource.includes('aria-modal="true"'), true)
})

test('管理员桌面侧栏应保持与用户页面一致的完整宽侧栏', async () => {
  const sidebarSource = await readFile(new URL('../src/components/Sidebar.jsx', import.meta.url), 'utf8')

  assert.equal(sidebarSource.includes("md:w-[220px] lg:w-[232px]"), true)
  assert.equal(sidebarSource.includes("isAdminOnly ? 'md:w-[92px] lg:w-[92px]'"), false)
  assert.equal(sidebarSource.includes("isAdminOnly ? 'md:sr-only'"), false)
  assert.equal(sidebarSource.includes("isAdminOnly ? 'md:flex-col'"), false)
  assert.equal(sidebarSource.includes('shrink-0'), true)
  assert.equal(sidebarSource.includes('user?.username'), true)
})
