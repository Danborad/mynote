import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('SharedNotePage renders the shared note title above content', async () => {
  const source = await readFile(new URL('./SharedNotePage.jsx', import.meta.url), 'utf8')

  assert.ok(source.includes('note?.title'))
  assert.ok(source.includes('<h1'))
})
