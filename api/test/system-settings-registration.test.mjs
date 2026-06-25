import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('系统设置应持久化 allowRegistration 并在注册时检查', async () => {
  const entitySource = await readFile(new URL('../src/entities/system-setting.entity.ts', import.meta.url), 'utf8').catch(() => '')
  const serviceSource = await readFile(new URL('../src/system-settings/system-settings.service.ts', import.meta.url), 'utf8').catch(() => '')
  const authSource = await readFile(new URL('../src/auth/auth.service.ts', import.meta.url), 'utf8')

  assert.equal(entitySource.includes("key: string;"), true)
  assert.equal(entitySource.includes("value: any;"), true)
  assert.equal(serviceSource.includes("key: 'allowRegistration'"), true)
  assert.equal(authSource.includes('getAllowRegistration()'), true)
})
