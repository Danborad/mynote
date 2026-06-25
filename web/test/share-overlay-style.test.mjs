import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('桌面设置和分享链接页不应通过 modal shell 或遮罩呈现', async () => {
    const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')
    const shellSource = await readFile(new URL('../src/components/CenteredModalShell.jsx', import.meta.url), 'utf8')

    assert.equal(appSource.includes('data-settings-desktop="inline-page"'), true)
    assert.equal(appSource.includes('data-share-links-desktop="inline-page"'), true)
    assert.equal(appSource.includes('title="设置中心"'), false)
    assert.equal(appSource.includes('title="分享链接管理"'), false)
    assert.equal(appSource.includes('<SettingsPage onClose={() => switchView(lastBoardView)} isOverlayDrawer />'), false)
    assert.equal(appSource.includes('<ShareLinksPage onClose={() => switchView(lastBoardView)} isOverlayDrawer />'), false)
    assert.equal(shellSource.includes('style={overlayStyle}'), true)
    assert.equal(appSource.includes('dark:bg-slate-950/26'), false)
})
