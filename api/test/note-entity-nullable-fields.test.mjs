import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Note 实体应把可空字段声明为 nullable TypeScript 类型', async () => {
  const source = await readFile(new URL('../src/entities/note.entity.ts', import.meta.url), 'utf8')
  const notesServiceSource = await readFile(new URL('../src/notes/notes.service.ts', import.meta.url), 'utf8')

  assert.equal(source.includes('folderId: string | null;'), true)
  assert.equal(source.includes('color: string | null;'), true)
  assert.equal(notesServiceSource.includes('deleteAttachmentFilesForNotes'), true)
  assert.equal(notesServiceSource.includes('await this.deleteAttachmentFilesForNotes(['), true)
})
