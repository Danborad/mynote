import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('注册页验证码应完整显示而不是被 object-cover 裁切', async () => {
  const source = await readFile(new URL('../src/components/LoginPage.jsx', import.meta.url), 'utf8')

  assert.equal(source.includes("w-[120px] h-[50px]"), false)
  assert.equal(source.includes("w-[148px] h-[50px]"), true)
  assert.equal(source.includes('object-cover'), false)
  assert.equal(source.includes('object-contain'), true)
})
