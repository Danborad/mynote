import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('主题切换按钮应使用与轨道一致的圆角层级，避免边角割裂', async () => {
    const source = await readFile(new URL('../src/components/Sidebar.jsx', import.meta.url), 'utf8')

    assert.equal(source.includes('rounded-2xl p-1'), true)
    assert.equal(source.includes('rounded-md text-xs'), false)
    assert.equal(source.includes('rounded-xl text-xs'), true)
})
