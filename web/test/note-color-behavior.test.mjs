import test from 'node:test'
import assert from 'node:assert/strict'

import { NOTE_COLORS, applyLocalNoteColorChange, buildNoteColorMenuItems, mergeColorChangePreservingMetadata } from '../src/utils/noteColorBehavior.js'

test('背景颜色变更不应修改更新时间或排序依据', () => {
    const note = {
        id: 'note_1',
        title: '测试笔记',
        color: 'ocean',
        updatedAt: '2026-03-20T10:00:00.000Z',
        createdAt: '2026-03-18T08:00:00.000Z',
    }

    const updated = applyLocalNoteColorChange(note, null)

    assert.equal(updated.color, null)
    assert.equal(updated.updatedAt, note.updatedAt)
    assert.equal(updated.createdAt, note.createdAt)
})

test('颜色菜单应提供明确的恢复默认入口', () => {
    const items = buildNoteColorMenuItems('mint')

    assert.equal(items[0].id, 'reset')
    assert.equal(items[0].label, '恢复默认')
    assert.equal(items[0].value, null)
    assert.equal(items[0].selected, false)
})

test('颜色修改合并到列表状态时应保留原更新时间和创建时间', () => {
    const currentNote = {
        id: 'note_1',
        title: '原始标题',
        color: null,
        updatedAt: '2026-03-12T10:00:00.000Z',
        createdAt: '2026-03-01T09:00:00.000Z',
    }

    const apiResponse = {
        id: 'note_1',
        title: '原始标题',
        color: 'sunset',
        updatedAt: '2026-03-20T11:30:00.000Z',
        createdAt: '2026-03-20T11:30:00.000Z',
    }

    const merged = mergeColorChangePreservingMetadata(currentNote, apiResponse)

    assert.equal(merged.color, 'sunset')
    assert.equal(merged.updatedAt, currentNote.updatedAt)
    assert.equal(merged.createdAt, currentNote.createdAt)
})

test('mint 颜色应使用更柔和的高级渐变而不是高饱和荧光绿', () => {
    const mint = NOTE_COLORS.find((color) => color.id === 'mint')

    assert.equal(Boolean(mint), true)
    assert.equal(mint.light, 'linear-gradient(135deg, #c8ead7 0%, #86c5b2 100%)')
    assert.equal(mint.dark, 'linear-gradient(135deg, #14332a 0%, #1b4740 100%)')
})

test('偏亮预设色应压低亮度并保留高级渐变感', () => {
    const sunrise = NOTE_COLORS.find((color) => color.id === 'sunrise')
    const lavender = NOTE_COLORS.find((color) => color.id === 'lavender')
    const aurora = NOTE_COLORS.find((color) => color.id === 'aurora')

    assert.equal(Boolean(sunrise), true)
    assert.equal(Boolean(lavender), true)
    assert.equal(Boolean(aurora), true)

    assert.equal(sunrise.light, 'linear-gradient(135deg, #d7ebf3 0%, #9fc7d8 100%)')
    assert.equal(lavender.light, 'linear-gradient(135deg, #cfcaf6 0%, #93a9ec 100%)')
    assert.equal(aurora.light, 'linear-gradient(135deg, #c4e4de 0%, #c3d9d6 100%)')
})
