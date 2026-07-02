import test from 'node:test'
import assert from 'node:assert/strict'

test('normalizes legacy absolute upload urls to the public share origin', async () => {
  const { normalizeSharedMediaUrls } = await import('../dist/notes/media-url-normalizer.js')

  const content = [
    '<p>old image</p>',
    '<img src="http://192.168.31.35:3665/uploads/attachments/old-image.jpg">',
    '<video-player-component src="http://10.0.0.2:3665/api/uploads/attachments/clip.mp4"></video-player-component>',
  ].join('')

  const normalized = normalizeSharedMediaUrls(content, 'https://notes.example.com')

  assert.equal(
    normalized,
    [
      '<p>old image</p>',
      '<img src="https://notes.example.com/uploads/attachments/old-image.jpg">',
      '<video-player-component src="https://notes.example.com/uploads/attachments/clip.mp4"></video-player-component>',
    ].join(''),
  )
})

test('normalizes relative api upload urls without duplicating slashes', async () => {
  const { normalizeSharedMediaUrls } = await import('../dist/notes/media-url-normalizer.js')

  assert.equal(
    normalizeSharedMediaUrls('<img src="api/uploads/attachments/demo.png">', 'https://notes.example.com/'),
    '<img src="https://notes.example.com/uploads/attachments/demo.png">',
  )
})
