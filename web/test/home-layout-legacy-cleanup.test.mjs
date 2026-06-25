import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('首页历史布局参数链应被清理，避免保留无效状态和传参', async () => {
    const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')
    const settingsSource = await readFile(new URL('../src/components/SettingsPage.jsx', import.meta.url), 'utf8')

    assert.equal(appSource.includes('webHomeLayout'), false)
    assert.equal(appSource.includes('webHomeDensity'), false)
    assert.equal(settingsSource.includes('webHomeLayout'), false)
    assert.equal(settingsSource.includes('webHomeDensity'), false)
})
