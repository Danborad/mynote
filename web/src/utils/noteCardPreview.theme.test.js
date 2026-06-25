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

test('light mode keeps legacy dark default card background on the note board', async () => {
  const { getDesktopCardTheme } = await import(`./noteCardPreview.js?theme=${Date.now()}-1`)

  const theme = getDesktopCardTheme({ color: null }, { image: null, audio: false, video: false }, [], false)

  assert.equal(theme.cardBackground, 'linear-gradient(180deg, #303a52 0%, #20283b 50%, #20283b 100%)')
  assert.equal(theme.mediaType, 'default')
})

test('dark mode keeps dark default card background', async () => {
  const { getDesktopCardTheme } = await import(`./noteCardPreview.js?theme=${Date.now()}-2`)

  const theme = getDesktopCardTheme({ color: null }, { image: null, audio: false, video: false }, [], true)

  assert.equal(theme.cardBackground, 'linear-gradient(180deg, #303a52 0%, #20283b 50%, #20283b 100%)')
  assert.equal(theme.mediaType, 'default')
})
