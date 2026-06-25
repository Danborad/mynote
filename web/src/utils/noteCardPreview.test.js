import test from 'node:test'
import assert from 'node:assert/strict'

function installBrowserMocks(serverUrl = '') {
  const store = new Map()
  if (serverUrl) {
    store.set('mynote_server_url', serverUrl)
  }

  globalThis.localStorage = {
    getItem(key) {
      return store.has(key) ? store.get(key) : null
    },
    setItem(key, value) {
      store.set(key, String(value))
    },
    removeItem(key) {
      store.delete(key)
    },
  }

  globalThis.window = {
    location: {
      origin: 'http://[2001:db8::2]:5173',
    },
  }
}

test('extractPreviewData resolves uploads path against ipv6 api origin', async () => {
  installBrowserMocks('http://[2001:db8::1]:3000/api')
  const { extractPreviewData } = await import(`./noteCardPreview.js?case=${Date.now()}-1`)

  const preview = extractPreviewData('<p><img src="/uploads/attachments/demo.png" /></p>')

  assert.equal(preview.image, 'http://[2001:db8::1]:3000/uploads/attachments/demo.png')
})

test('extractPreviewData normalizes legacy api uploads path for ipv6 api origin', async () => {
  installBrowserMocks('http://[2001:db8::1]:3000/api')
  const { extractPreviewData } = await import(`./noteCardPreview.js?case=${Date.now()}-2`)

  const preview = extractPreviewData('<p><img src="api/uploads/attachments/demo.png" /></p>')

  assert.equal(preview.image, 'http://[2001:db8::1]:3000/uploads/attachments/demo.png')
})
