import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('管理员备份 API 应提供受保护的导出导入与注册开关接口', async () => {
  const controllerSource = await readFile(new URL('../src/admin/admin.controller.ts', import.meta.url), 'utf8').catch(() => '')
  const serviceSource = await readFile(new URL('../src/admin/admin.service.ts', import.meta.url), 'utf8').catch(() => '')
  const guardSource = await readFile(new URL('../src/admin/admin.guard.ts', import.meta.url), 'utf8').catch(() => '')

  assert.equal(controllerSource.includes("@Controller('admin')"), true)
  assert.equal(controllerSource.includes("@Get('backup/export')"), true)
  assert.equal(controllerSource.includes("@Post('backup/import/validate')"), true)
  assert.equal(controllerSource.includes("@Post('backup/import/execute')"), true)
  assert.equal(controllerSource.includes("@Get('settings')"), true)
  assert.equal(controllerSource.includes("@Put('settings/registration')"), true)
  assert.equal(guardSource.includes('canActivate'), true)
  assert.equal(serviceSource.includes('exportInstanceBackup'), true)
  assert.equal(serviceSource.includes('archiver'), true)
  assert.equal(serviceSource.includes('uploads/attachments'), true)
  assert.equal(serviceSource.includes('uploads/avatars'), true)
  assert.equal(serviceSource.includes('validateInstanceBackupImport'), true)
  assert.equal(serviceSource.includes('executeInstanceBackupImport'), true)
  assert.equal(controllerSource.includes("@Get('overview')"), true)
  assert.equal(serviceSource.includes('getOverview'), true)
  assert.equal(serviceSource.includes('users.filter((user) => !user.isAdmin)'), true)
  assert.equal(serviceSource.includes('calculateUserStorage'), true)
  assert.equal(serviceSource.includes('!note.isDeleted'), true)
  assert.equal(serviceSource.includes('archive.file('), true)
})
