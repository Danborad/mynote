import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('设置页不应再显示已废弃的首页布局和卡片密度选项', async () => {
    const source = await readFile(new URL('../src/components/SettingsPage.jsx', import.meta.url), 'utf8')

    assert.equal(source.includes('首页卡片排布'), false)
    assert.equal(source.includes('卡片密度'), false)
    assert.equal(source.includes('双列浏览'), false)
    assert.equal(source.includes('超紧凑'), false)
})
