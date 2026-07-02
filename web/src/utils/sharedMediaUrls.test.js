import test from 'node:test'
import assert from 'node:assert/strict'

test('normalizeSharedHtmlMediaUrls rewrites legacy ipv4 uploads to current origin', async () => {
  const { normalizeSharedHtmlMediaUrls } = await import(`./sharedMediaUrls.js?case=${Date.now()}-1`)

  const html = '<p>图片</p><img src="http://192.168.31.35:3665/uploads/attachments/old.png">'

  assert.equal(
    normalizeSharedHtmlMediaUrls(html, 'https://notes.example.com'),
    '<p>图片</p><img src="https://notes.example.com/uploads/attachments/old.png">',
  )
})

test('resolveSharedMediaUrl keeps non-upload external urls unchanged', async () => {
  const { resolveSharedMediaUrl } = await import(`./sharedMediaUrls.js?case=${Date.now()}-2`)

  assert.equal(
    resolveSharedMediaUrl('https://cdn.example.com/image.png', 'https://notes.example.com'),
    'https://cdn.example.com/image.png',
  )
})
