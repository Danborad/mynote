import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('NoteList 不应保留未使用的 viewTitles 常量', async () => {
    const source = await readFile(new URL('../src/components/NoteList.jsx', import.meta.url), 'utf8')
    assert.equal(source.includes('const viewTitles = {'), false)
})
