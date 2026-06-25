import test from 'node:test'
import assert from 'node:assert/strict'

import { NotesService } from '../dist/notes/notes.service.js'

test('setColor 仅更新颜色，不应触发 updatedAt 变化', async () => {
    const originalUpdatedAt = new Date('2026-03-20T10:00:00.000Z')
    const storedNote = {
        id: 'note_1',
        userId: 'user_1',
        title: '测试笔记',
        content: 'content',
        isDeleted: false,
        color: 'ocean',
        updatedAt: originalUpdatedAt,
    }

    let updatePayload = null
    let saveCalled = false

    const noteRepository = {
        find: async () => [],
        findOne: async ({ where }) => {
            if (where?.id === storedNote.id && where?.userId === storedNote.userId) {
                return { ...storedNote }
            }
            return null
        },
        update: async (criteria, payload) => {
            updatePayload = { criteria, payload }
            storedNote.color = payload.color
        },
        save: async (note) => {
            saveCalled = true
            return {
                ...note,
                updatedAt: new Date('2026-03-20T10:05:00.000Z'),
            }
        },
    }

    const userRepository = {
        find: async () => [],
        findOne: async () => null,
    }

    const service = new NotesService(noteRepository, userRepository)

    const result = await service.setColor('note_1', 'user_1', null)

    assert.equal(saveCalled, false)
    assert.deepEqual(updatePayload, {
        criteria: { id: 'note_1', userId: 'user_1' },
        payload: { color: null },
    })
    assert.equal(result.color, null)
    assert.equal(result.updatedAt.toISOString(), originalUpdatedAt.toISOString())
})
