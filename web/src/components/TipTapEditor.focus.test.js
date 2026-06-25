import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('TipTapEditor shows an empty-note hint and focuses new notes', async () => {
  const source = await readFile(new URL('./TipTapEditor.jsx', import.meta.url), 'utf8')

  assert.ok(source.includes('@tiptap/extension-placeholder'))
  assert.ok(source.includes('placeholder:'))
  assert.ok(source.includes('开始写点什么'))
  assert.ok(source.includes("editor.commands.focus('end')"))
})
