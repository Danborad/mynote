import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Web 应提供管理员页面入口并按 Stitch 用户管理中心结构渲染', async () => {
  const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')
  const sidebarSource = await readFile(new URL('../src/components/Sidebar.jsx', import.meta.url), 'utf8')
  const adminPageSource = await readFile(new URL('../src/components/admin/AdminPage.jsx', import.meta.url), 'utf8').catch(() => '')
  const usersPanelSource = await readFile(new URL('../src/components/admin/AdminUsersPanel.jsx', import.meta.url), 'utf8').catch(() => '')

  assert.equal(appSource.includes('if (user?.isAdmin)'), true)
  assert.equal(appSource.includes("currentView={adminSection === 'settings' ? 'settings' : 'admin'}"), true)
  assert.equal(appSource.includes("currentView={currentView === 'settings' ? 'settings' : 'admin'}"), false)
  assert.equal(sidebarSource.includes('管理员后台'), true)
  assert.equal(sidebarSource.includes('isAdminOnly ? ['), true)
  assert.equal(sidebarSource.includes("const activeNavId = isAdminOnly ? (currentView === 'settings' ? 'settings' : 'admin') : currentView"), true)
  assert.equal(sidebarSource.includes("{ id: 'settings', icon: 'settings', label: '全局设置', count: null }"), true)
  assert.equal(sidebarSource.includes("{ id: 'data'"), false)
  assert.equal(sidebarSource.includes('user?.username'), true)
  assert.equal(adminPageSource.includes('用户管理控制中心'), true)
  assert.equal(adminPageSource.includes('导出实例数据'), true)
  assert.equal(adminPageSource.includes('导入备份预检'), true)
  assert.equal(adminPageSource.includes('新增用户账号'), true)
  assert.equal(adminPageSource.includes('活跃用户总数'), true)
  assert.equal(adminPageSource.includes('笔记创建总量'), true)
  assert.equal(adminPageSource.includes('formatNoteCount'), true)
  assert.equal(adminPageSource.includes('系统总存储占用'), true)
  assert.equal(adminPageSource.includes('min-h-[860px]'), false)
  assert.equal(adminPageSource.includes('grid grid-cols-[0.9fr_0.9fr_1.2fr] gap-4 mb-4'), false)
  assert.equal(adminPageSource.includes('grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[0.9fr_0.9fr_1.2fr]'), true)
  assert.equal(adminPageSource.includes('h-[128px]'), false)
  assert.equal(adminPageSource.includes('totalStorageUsedBytes'), true)
  assert.equal(adminPageSource.includes('formatStorageValue(totalStorageUsedBytes)'), true)
  assert.equal(adminPageSource.includes("currentSection === 'settings'"), true)
  assert.equal(adminPageSource.includes('数据资源'), false)
  assert.equal(usersPanelSource.includes('筛选账号状态'), true)
  assert.equal(usersPanelSource.includes('onStatusFilterChange'), true)
  assert.equal(usersPanelSource.includes('用户信息 / 邮箱'), true)
  assert.equal(usersPanelSource.includes('管理操作'), true)
  assert.equal(usersPanelSource.includes('更改密码'), true)
  assert.equal(adminPageSource.includes('handleOpenPasswordModal'), true)
  assert.equal(adminPageSource.includes('handleSubmitPasswordChange'), true)
  assert.equal(adminPageSource.includes('新增用户账号'), true)
  assert.equal(adminPageSource.includes('用户管理'), true)
})

test('管理员侧边栏也应保留主题切换入口，并按当前 section 高亮导航', async () => {
  const sidebarSource = await readFile(new URL('../src/components/Sidebar.jsx', import.meta.url), 'utf8')

  assert.equal(sidebarSource.includes("const activeNavId = isAdminOnly ? (currentView === 'settings' ? 'settings' : 'admin') : currentView"), true)
  assert.equal(sidebarSource.includes('activeNavId === item.id'), true)
  assert.equal(sidebarSource.includes('{!isAdminOnly && ('), true)
  assert.equal(sidebarSource.includes('{!isAdminOnly && (\n                        <div className="bg-white dark:bg-[#111925] p-3.5 rounded-[24px] border border-[#e9edf2] dark:border-[#283445] shadow-[0_12px_24px_rgba(15,23,42,0.05)] dark:shadow-[0_18px_36px_rgba(2,6,14,0.28)]">'), false)
  assert.equal(sidebarSource.includes("onClick={() => setTheme('light')}"), true)
  assert.equal(sidebarSource.includes("onClick={() => setTheme('dark')}"), true)
  assert.equal(sidebarSource.includes("onClick={() => setTheme('system')}"), true)
})

test('管理员页切到全局设置时，页头文案和主操作也应跟随 section 切换', async () => {
  const adminPageSource = await readFile(new URL('../src/components/admin/AdminPage.jsx', import.meta.url), 'utf8')

  assert.equal(adminPageSource.includes("const isSettingsSection = currentSection === 'settings'"), true)
  assert.equal(adminPageSource.includes("const pageTitle = isSettingsSection ? '全局设置' : '用户管理控制中心'"), true)
  assert.equal(adminPageSource.includes("const pageDescription = isSettingsSection"), true)
  assert.equal(adminPageSource.includes('{pageTitle}'), true)
  assert.equal(adminPageSource.includes('{pageDescription}'), true)
  assert.equal(adminPageSource.includes('{!isSettingsSection && ('), true)
  assert.equal(adminPageSource.includes('新增用户账号'), true)
})

test('普通用户工作区不应渲染管理员页面请求', async () => {
  const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')

  assert.equal(appSource.includes("currentView === 'admin' ? 'flex md:hidden'"), false)
  assert.equal(appSource.includes("{currentView === 'admin' && user?.isAdmin && ("), false)
})
