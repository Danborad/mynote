import test from 'node:test'
import assert from 'node:assert/strict'

globalThis.localStorage = {
  getItem() {
    return null
  },
  setItem() {},
  removeItem() {},
}

globalThis.window = {
  location: {
    origin: 'http://127.0.0.1:3665',
  },
}

test('浅色模式下首页默认、图片、音频和视频卡片应沿用旧版深蓝色系', async () => {
  const { getDesktopCardTheme } = await import(`../src/utils/noteCardPreview.js?media-light=${Date.now()}`)

  const defaultTheme = getDesktopCardTheme({ color: null }, { image: null, audio: false, video: false }, [], false)
  const imageTheme = getDesktopCardTheme({ color: null }, { image: '/cover.png', audio: false, video: false }, [], false)
  const audioTheme = getDesktopCardTheme({ color: null }, { image: null, audio: true, video: false }, [], false)
  const videoTheme = getDesktopCardTheme({ color: null }, { image: null, audio: false, video: true }, [], false)
  const customColorTheme = getDesktopCardTheme(
    { color: 'mint' },
    { image: null, audio: false, video: false },
    [{ value: 'mint', light: 'linear-gradient(135deg, #c8ead7 0%, #86c5b2 100%)', dark: 'linear-gradient(135deg, #14332a 0%, #1b4740 100%)' }],
    false,
  )

  assert.equal(defaultTheme.mediaType, 'default')
  assert.equal(imageTheme.mediaType, 'image')
  assert.equal(audioTheme.mediaType, 'audio')
  assert.equal(videoTheme.mediaType, 'video')
  assert.equal(defaultTheme.cardBackground, 'linear-gradient(180deg, #303a52 0%, #20283b 50%, #20283b 100%)')
  assert.equal(imageTheme.cardBackground, 'linear-gradient(180deg, #303a52 0%, #20283b 48%, #20283b 100%)')
  assert.equal(audioTheme.cardBackground, 'linear-gradient(180deg, #2f3a52 0%, #202a40 46%, #1f2940 100%)')
  assert.equal(videoTheme.cardBackground, 'linear-gradient(180deg, #2f3a52 0%, #202a40 46%, #1f2940 100%)')
  assert.equal(customColorTheme.cardBackground, 'linear-gradient(135deg, #14332a 0%, #1b4740 100%)')
})
