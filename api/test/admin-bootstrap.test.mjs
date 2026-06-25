import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('管理员初始化应读取默认管理员环境变量并只在缺失时创建', async () => {
  const source = await readFile(new URL('../src/admin/admin-bootstrap.service.ts', import.meta.url), 'utf8').catch(() => '')
  const userEntity = await readFile(new URL('../src/entities/user.entity.ts', import.meta.url), 'utf8')

  assert.equal(userEntity.includes('isAdmin'), true)
  assert.equal(source.includes('ADMIN_USERNAME'), true)
  assert.equal(source.includes('ADMIN_PASSWORD'), true)
  assert.equal(source.includes('findOne'), true)
  assert.equal(source.includes('save('), true)
  assert.equal(source.includes('where: { username }'), true)
  assert.equal(source.includes('isAdmin = true'), true)
})
