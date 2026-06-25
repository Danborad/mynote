import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Sidebar places share links after trash in the main navigation', async () => {
  const source = await readFile(new URL('./Sidebar.jsx', import.meta.url), 'utf8')

  const trashIndex = source.indexOf("{ id: 'trash', icon: 'delete', label: '废纸篓'")
  const sharesIndex = source.indexOf("{ id: 'shares', icon: 'link', label: '分享链接'")

  assert.notEqual(trashIndex, -1)
  assert.notEqual(sharesIndex, -1)
  assert.ok(trashIndex < sharesIndex)
})
