import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('图片分享模板样式应限制在专用容器内，避免污染卡片图片样式', async () => {
    const noteListSource = await readFile(new URL('../src/components/NoteList.jsx', import.meta.url), 'utf8')
    const editorSource = await readFile(new URL('../src/components/Editor.jsx', import.meta.url), 'utf8')

    for (const source of [noteListSource, editorSource]) {
        assert.equal(source.includes('.mynote-share-render img {'), true)
        assert.equal(source.includes('.mynote-share-render p {'), true)
        assert.equal(source.includes('.mynote-share-render pre {'), true)
        assert.equal(source.includes('\n                    img { display: block;'), false)
        assert.equal(source.includes('\n                    p { margin: 8px 0; }'), false)
    }
})
