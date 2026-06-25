import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('管理员 API 应提供用户列表、重置密码和禁用启用接口', async () => {
  const controllerSource = await readFile(new URL('../src/admin/admin.controller.ts', import.meta.url), 'utf8')
  const serviceSource = await readFile(new URL('../src/admin/admin.service.ts', import.meta.url), 'utf8')
  const userEntitySource = await readFile(new URL('../src/entities/user.entity.ts', import.meta.url), 'utf8')

  assert.equal(controllerSource.includes("@Get('users')"), true)
  assert.equal(controllerSource.includes("@Post('users')"), true)
  assert.equal(controllerSource.includes("@Post('users/:id/reset-password')"), true)
  assert.equal(controllerSource.includes("@Put('users/:id/status')"), true)
  assert.equal(serviceSource.includes('listUsers'), true)
  assert.equal(serviceSource.includes('createUser'), true)
  assert.equal(serviceSource.includes('resetUserPassword'), true)
  assert.equal(serviceSource.includes('setUserStatus'), true)
  assert.equal(serviceSource.includes('calculateUserStorage'), true)
  assert.equal(serviceSource.includes('!user.isAdmin'), true)
  assert.equal(serviceSource.includes('storageUsedBytes'), true)
  assert.equal(serviceSource.includes('lastLoginAt'), true)
  assert.equal(userEntitySource.includes('email'), true)
  assert.equal(userEntitySource.includes('lastLoginAt'), true)
  assert.equal(userEntitySource.includes('isDisabled'), true)
})
