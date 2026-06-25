import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Material Icons 字体未就绪时不应露出 ligature 文本', async () => {
  const indexHtml = await readFile(new URL('../index.html', import.meta.url), 'utf8')
  const mainSource = await readFile(new URL('../src/main.jsx', import.meta.url), 'utf8')
  const cssSource = await readFile(new URL('../src/index.css', import.meta.url), 'utf8')

  assert.equal(indexHtml.includes('icons-loading'), true)
  assert.equal(mainSource.includes('document.fonts.load'), true)
  assert.equal(mainSource.includes('icons-ready'), true)
  assert.equal(cssSource.includes('html.icons-loading .material-icons-outlined'), true)
  assert.equal(cssSource.includes('html.icons-ready .material-icons-outlined'), true)
  assert.equal(cssSource.includes('opacity: 0;'), true)
  assert.equal(cssSource.includes('opacity: 1;'), true)
  assert.equal(cssSource.includes('html.icons-loading .material-icons-outlined {\n  color: transparent;'), false)
  assert.equal(cssSource.includes('html.icons-ready .material-icons-outlined {\n  color: inherit;'), false)
})
