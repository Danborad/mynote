import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('移动端进入设置和分享链接时应隐藏笔记列表而不是叠在下面', async () => {
  const source = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')
  const settingsSource = await readFile(new URL('../src/components/SettingsPage.jsx', import.meta.url), 'utf8')
  const sharesSource = await readFile(new URL('../src/components/ShareLinksPage.jsx', import.meta.url), 'utf8')

  assert.equal(source.includes("currentView === 'settings' ? 'flex md:hidden' : 'hidden'"), true)
  assert.equal(source.includes("currentView === 'shares' ? 'flex md:hidden' : 'hidden'"), true)
  assert.equal(settingsSource.includes("px-3 pt-2 pb-4 md:pl-16 md:pr-3 md:pt-5 md:pb-6"), true)
  assert.equal(sharesSource.includes("px-3 pt-2 pb-4 md:pl-16 md:pr-3 md:pt-5 md:pb-6"), true)
})

test('移动端设置和分享链接不应保留首页专用的底部遮罩留白', async () => {
  const settingsSource = await readFile(new URL('../src/components/SettingsPage.jsx', import.meta.url), 'utf8')
  const sharesSource = await readFile(new URL('../src/components/ShareLinksPage.jsx', import.meta.url), 'utf8')

  assert.equal(settingsSource.includes('pb-24'), false)
  assert.equal(sharesSource.includes('pb-24'), false)
  assert.equal(settingsSource.includes('pb-4'), true)
  assert.equal(sharesSource.includes('pb-4'), true)
})

test('桌面设置和分享链接页应使用工作区内联页面轨道而不是居中弹窗卡片', async () => {
  const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')
  const settingsSource = await readFile(new URL('../src/components/SettingsPage.jsx', import.meta.url), 'utf8')
  const sharesSource = await readFile(new URL('../src/components/ShareLinksPage.jsx', import.meta.url), 'utf8')

  assert.equal(appSource.includes('data-settings-desktop="inline-page"'), true)
  assert.equal(appSource.includes('data-share-links-desktop="inline-page"'), true)
  assert.equal(appSource.includes('title="设置中心"'), false)
  assert.equal(appSource.includes('title="分享链接管理"'), false)
  assert.equal(settingsSource.includes("data-settings-page={isOverlayDrawer ? undefined : 'inline'}"), true)
  assert.equal(settingsSource.includes("px-3 pt-2 pb-4 md:pl-16 md:pr-3 md:pt-5 md:pb-6"), true)
  assert.equal(settingsSource.includes('surface-card max-w-[680px] mx-auto'), false)
  assert.equal(settingsSource.includes('mr-auto h-full w-full max-w-[720px]'), true)
  assert.equal(settingsSource.includes('hidden md:flex h-12 items-center mb-2.5'), true)
  assert.equal(settingsSource.includes('hidden md:flex h-12 items-center justify-between mb-2.5'), false)
  assert.equal(settingsSource.includes('arrow_back'), false)
  assert.equal(settingsSource.includes('返回'), false)
  assert.equal(settingsSource.includes('max-w-[760px]'), false)
  assert.equal(settingsSource.includes('mx-auto h-full w-full max-w-[980px]'), false)
  assert.equal(settingsSource.includes('md:mb-2.5'), true)
  assert.equal(settingsSource.includes('md:min-h-[58px]'), true)
  assert.equal(settingsSource.includes('md:p-2.5'), true)
  assert.equal(settingsSource.includes('md:space-y-1.5'), true)
  assert.equal(sharesSource.includes("data-share-links-page={isOverlayDrawer ? undefined : 'inline'}"), true)
  assert.equal(sharesSource.includes("px-3 pt-2 pb-4 md:pl-16 md:pr-3 md:pt-5 md:pb-6"), true)
  assert.equal(sharesSource.includes('surface-card max-w-3xl mx-auto'), false)
  assert.equal(sharesSource.includes('hidden md:flex items-center justify-between mb-5'), false)
  assert.equal(sharesSource.includes('mr-auto h-12 w-full max-w-[980px]'), false)
  assert.equal(sharesSource.includes('hidden md:flex h-12 w-full max-w-[980px] items-center mb-4'), true)
  assert.equal(sharesSource.includes('arrow_back'), false)
  assert.equal(sharesSource.includes('返回'), false)
  assert.equal(sharesSource.includes('已创建链接'), false)
  assert.equal(sharesSource.includes('mr-auto w-full max-w-[980px]'), true)
  assert.equal(sharesSource.includes('mx-auto h-12 w-full max-w-[980px]'), false)
  assert.equal(sharesSource.includes('mx-auto w-full max-w-[980px]'), false)
})

test('移动端编辑器顶栏应在安全区下方保留额外呼吸空间', async () => {
  const editorSource = await readFile(new URL('../src/components/Editor.jsx', import.meta.url), 'utf8')

  assert.equal(editorSource.includes('flex-1 min-h-0 pt-[calc(env(safe-area-inset-top)+6px)] px-3 pb-0 z-20'), true)
})

test('移动端编辑器顶栏和底部工具栏应与正文卡片共用同一条内容轨道', async () => {
  const editorSource = await readFile(new URL('../src/components/Editor.jsx', import.meta.url), 'utf8')
  const toolbarSource = await readFile(new URL('../src/components/EditorToolbar.jsx', import.meta.url), 'utf8')

  assert.equal(editorSource.includes('px-3 md:px-0'), true)
  assert.equal(editorSource.includes('if (!isOverlayDrawer) {'), true)
  assert.equal(editorSource.includes('surface-card max-w-4xl bg-[#fbfcfe]/96 dark:bg-[#211d1b]/86 rounded-[28px]'), true)
  assert.equal(editorSource.includes('border-b border-[#e8eef5] dark:border-[#2a3645]'), true)
  assert.equal(toolbarSource.includes('left-1/2 -translate-x-1/2'), true)
  assert.equal(toolbarSource.includes('left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2'), false)
  assert.equal(toolbarSource.includes('w-auto min-w-fit max-w-[calc(100vw-7rem)]'), true)
})

test('笔记编辑器底部工具栏应使用实色白底而不是玻璃效果', async () => {
  const toolbarSource = await readFile(new URL('../src/components/EditorToolbar.jsx', import.meta.url), 'utf8')

  assert.equal(toolbarSource.includes('bg-white dark:bg-[#111925]'), true)
  assert.equal(toolbarSource.includes('border border-[#e7edf5] dark:border-[#283445]'), true)
  assert.equal(toolbarSource.includes('bg-white/88'), false)
  assert.equal(toolbarSource.includes('border-white/70'), false)
  assert.equal(toolbarSource.includes('backdrop-blur-xl'), false)
})

test('移动端编辑器不应保留过大的顶部和底部空白切断内容', async () => {
  const editorSource = await readFile(new URL('../src/components/Editor.jsx', import.meta.url), 'utf8')
  const tiptapSource = await readFile(new URL('../src/components/TipTapEditor.jsx', import.meta.url), 'utf8')
  const cssSource = await readFile(new URL('../src/index.css', import.meta.url), 'utf8')

  assert.equal(editorSource.includes('px-4 py-4 md:p-0 pb-28'), false)
  assert.equal(editorSource.includes('flex-1 min-h-0 pt-[calc(env(safe-area-inset-top)+6px)] px-3 pb-0 z-20'), true)
  assert.equal(editorSource.includes('mb-2.5 text-sm text-gray-400'), true)
  assert.equal(editorSource.includes('border-b border-dashed border-gray-200 dark:border-gray-700 mb-3'), true)
  assert.equal(editorSource.includes("surface-card max-w-4xl bg-[#fbfcfe]/96 dark:bg-[#211d1b]/86 rounded-[28px] px-6 md:px-10 pt-7 md:pt-9 pb-8'} mx-auto min-h-full flex flex-col"), false)
  assert.equal(editorSource.includes('mx-auto flex flex-col md:min-h-full'), true)
  assert.equal(tiptapSource.includes("className={`w-full md:flex-1 text-gray-700 dark:text-text-main leading-relaxed ${className || ''}`}"), true)
  assert.equal(cssSource.includes('display: block;'), true)
  assert.equal(cssSource.includes('.ProseMirror p:last-child {'), true)
  assert.equal(cssSource.includes('margin-bottom: 0;'), true)
  assert.equal(editorSource.includes('const isMediaOnlyNote = /^<p><img[^>]+><br class="ProseMirror-trailingBreak"><\\/p>$/i.test((content || \'\').trim())'), true)
  assert.equal(editorSource.includes("${isMediaOnlyNote ? 'pb-0' : 'pb-[72px]'}"), true)
  assert.equal(editorSource.includes("className={isOverlayDrawer ? `open-canvas-editor-content ${isMediaOnlyNote ? 'media-only-editor' : ''}` : isMediaOnlyNote ? 'media-only-editor' : ''}"), true)
  assert.equal(cssSource.includes('.media-only-editor .ProseMirror {'), true)
  assert.equal(cssSource.includes('min-height: auto;'), true)
  assert.equal(cssSource.includes('.media-only-editor .ProseMirror p {'), true)
  assert.equal(cssSource.includes('line-height: 0;'), true)
  assert.equal(cssSource.includes('.media-only-editor .ProseMirror .ProseMirror-trailingBreak {'), true)
  assert.equal(cssSource.includes('display: none;'), true)
  assert.equal(cssSource.includes('.media-only-editor .ProseMirror p:has(> img:only-child) {'), true)
  assert.equal(cssSource.includes('margin: 0;'), true)
  assert.equal(editorSource.includes('overflow-y-auto no-scrollbar pt-3'), true)
})

test('移动端打开笔记时不应同时渲染桌面内联画布编辑器', async () => {
  const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')

  assert.equal(appSource.includes('data-note-detail-desktop="inline-canvas"'), true)
  assert.equal(appSource.includes("className=\"hidden md:flex flex-col flex-1 min-h-0 pb-0 md:pb-0\""), true)
  assert.equal(appSource.includes('<CenteredModalShell'), false)
  assert.equal(appSource.includes('title="笔记详情"'), false)
})

test('移动端设置中心应具备设计稿所需的总览卡、统计格子、导入卡和安全卡样式', async () => {
  const settingsSource = await readFile(new URL('../src/components/SettingsPage.jsx', import.meta.url), 'utf8')

  assert.equal(settingsSource.includes('移动端设置总览'), true)
  assert.equal(settingsSource.includes('grid grid-cols-2 gap-3'), true)
  assert.equal(settingsSource.includes("label: '置顶笔记'"), true)
  assert.equal(settingsSource.includes("label: '附件存储'"), true)
  assert.equal(settingsSource.includes("label: '总字符数'"), true)
  assert.equal(settingsSource.includes('账号信息'), true)
  assert.equal(settingsSource.includes('aria-label="修改用户名"'), true)
  assert.equal(settingsSource.includes('camera_alt'), true)
  assert.equal(settingsSource.includes('导入笔记'), true)
  assert.equal(settingsSource.includes('选择文件导入'), true)
  assert.equal(settingsSource.includes('修改密码'), true)
  assert.equal(settingsSource.includes('lock_reset'), true)
  assert.equal(settingsSource.includes('V 4.2.0 (Build 2910)'), true)
  assert.equal(settingsSource.includes('rounded-[24px]'), true)
  assert.equal(settingsSource.includes("value: stats.totalWordCount?.toLocaleString('zh-CN')"), true)
  assert.equal(settingsSource.includes("`${Math.round(stats.totalWordCount / 1000)}k`"), false)
  assert.equal(settingsSource.includes('storageRatio'), false)
  assert.equal(settingsSource.includes('more_vert'), false)
})
