import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('ShareLinksPage desktop layout follows the approved v2 structure', async () => {
  const source = await readFile(new URL('./ShareLinksPage.jsx', import.meta.url), 'utf8')

  assert.ok(source.includes('data-share-links-content="desktop-v2"'))
  assert.ok(source.includes('max-w-[1042px]'))
  assert.ok(source.includes('grid-cols-[72px_minmax(0,1.1fr)_minmax(220px,0.8fr)_92px_126px]'))
  assert.ok(source.includes('分享链接管理'))
  assert.ok(source.includes('data-share-link-row'))
  assert.equal(source.includes('已创建链接'), false)
  assert.equal(source.includes('静雅工具感'), false)
  assert.equal(source.includes('↔'), false)
})
