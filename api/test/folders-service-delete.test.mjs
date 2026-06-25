import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('FoldersService 删除分组前应先把分组下笔记移到未分类', async () => {
  const source = await readFile(new URL('../src/folders/folders.service.ts', import.meta.url), 'utf8')

  assert.equal(source.includes('noteRepository'), true)
  assert.equal(source.includes('await this.noteRepository.update('), true)
  assert.equal(source.includes('{ folderId: id, userId }'), true)
  assert.equal(source.includes('{ folderId: null }'), true)
})
