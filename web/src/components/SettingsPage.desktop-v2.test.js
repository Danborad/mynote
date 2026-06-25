import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('SettingsPage desktop layout follows the approved v2 structure', async () => {
  const source = await readFile(new URL('./SettingsPage.jsx', import.meta.url), 'utf8')

  assert.ok(source.includes('data-settings-content="desktop-v2"'))
  assert.ok(source.includes('max-w-[1060px]'))
  assert.ok(source.includes('grid-cols-[minmax(0,1fr)_316px]'))
  assert.ok(source.includes('const desktopSettingActionButtonClass'))
  assert.ok(source.includes('w-[132px] h-10'))
  assert.ok(source.includes('data-settings-action="import"'))
  assert.ok(source.includes('data-settings-action="password"'))
  assert.ok(source.includes('账户概览'))
  assert.equal(source.includes('静雅工具感'), false)
  assert.equal(source.includes('存储上限'), false)
  assert.equal(source.includes('storageLimitDisplay'), false)
  assert.equal(source.includes('storagePercent'), false)
})
