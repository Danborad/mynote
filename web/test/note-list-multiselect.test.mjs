import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('NoteList 应包含长按多选模式的核心状态与处理器', async () => {
    const source = await readFile(new URL('../src/components/NoteList.jsx', import.meta.url), 'utf8')

    assert.equal(source.includes('isSelectionMode'), true)
    assert.equal(source.includes('selectedNoteIds'), true)
    assert.equal(source.includes('longPressTimerRef'), true)
    assert.equal(source.includes('enterSelectionMode'), true)
    assert.equal(source.includes('toggleNoteSelection'), true)
    assert.equal(source.includes('handleNotePointerDown'), true)
    assert.equal(source.includes('handleNotePointerUp'), true)
})

test('NoteList 多选模式应包含批量分组与批量删除动作', async () => {
    const source = await readFile(new URL('../src/components/NoteList.jsx', import.meta.url), 'utf8')

    assert.equal(source.includes('handleBatchMoveToFolder'), true)
    assert.equal(source.includes('handleBatchDelete'), true)
    assert.equal(source.includes('showConfirm({'), true)
    assert.equal(source.includes('setBatchFolderMenuOpen(false)'), true)
    assert.equal(source.includes('handleCreateBatchFolder'), true)
    assert.equal(source.includes('批量新建分组'), true)
    assert.equal(source.includes('z-[1200]'), true)
    assert.equal(source.includes('batchFolderMenuRef'), true)
    assert.equal(source.includes('batchFolderMenuButtonRef'), true)
    assert.equal(source.includes('batchFolderMenuStyle'), true)
    assert.equal(source.includes('batchFolderMenuOpen && createPortal('), true)
    assert.equal(source.includes("currentView === 'trash'"), true)
    assert.equal(source.includes('已选'), true)
    assert.equal(source.includes('加入分组'), true)
    assert.equal(source.includes('取消'), true)
})

test('NoteList 多选模式下应阻止正常打开笔记和更多菜单', async () => {
    const source = await readFile(new URL('../src/components/NoteList.jsx', import.meta.url), 'utf8')

    assert.equal(source.includes('if (isSelectionMode)'), true)
    assert.equal(source.includes('toggleNoteSelection(note.id)'), true)
    assert.equal(source.includes('if (isSelectionMode) return'), true)
    assert.equal(source.includes('onToggleSelection={toggleNoteSelection}'), false)
    assert.equal(source.includes('toggleNoteSelection={toggleNoteSelection}'), true)
})

test('NoteList 长按进入多选后应吞掉同一次松手触发的首个 click，避免当前卡片被反选', async () => {
    const source = await readFile(new URL('../src/components/NoteList.jsx', import.meta.url), 'utf8')

    assert.equal(source.includes('const longPressSelectionNoteIdRef = useRef(null)'), true)
    assert.equal(source.includes('const consumeLongPressClick = (noteId) => {'), true)
    assert.equal(source.includes('if (consumeLongPressClick(note.id)) return'), true)
    assert.equal(source.includes('if (isSelectionMode) {\n          if (consumeLongPressClick(note.id)) return\n          toggleNoteSelection(note.id)'), true)
    assert.equal(source.includes('e.stopPropagation()\n            if (consumeLongPressClick(note.id)) return\n            toggleNoteSelection(note.id)'), true)
    assert.equal(source.includes('longPressSelectionNoteIdRef.current = noteId'), true)
    assert.equal(source.includes('longPressSelectionNoteIdRef.current = null'), true)
})

test('NoteList 多选数量归零时应自动退出多选模式，批量工具条按钮也应阻止事件冒泡', async () => {
    const source = await readFile(new URL('../src/components/NoteList.jsx', import.meta.url), 'utf8')

    assert.equal(source.includes('if (isSelectionMode && selectedNoteIds.length === 0) {'), true)
    assert.equal(source.includes('clearSelectionMode()'), true)
    assert.equal(source.includes('onClick={(e) => { e.stopPropagation();'), true)
    assert.equal(source.includes('加入分组'), true)
    assert.equal(source.includes('删除'), true)
    assert.equal(source.includes('取消'), true)
})

test('NoteList 文件夹菜单应使用 portal 浮层避免被卡片遮挡', async () => {
    const source = await readFile(new URL('../src/components/NoteList.jsx', import.meta.url), 'utf8')

    assert.equal(source.includes('folderMenuRef'), true)
    assert.equal(source.includes('folderMenuButtonRefs'), true)
    assert.equal(source.includes('folderMenuStyle'), true)
    assert.equal(source.includes('folderMenuOpen === folder.id && createPortal('), true)
    assert.equal(source.includes('z-[1100]'), true)
})

test('NoteList 文件夹删除应走 showConfirm 确认流程', async () => {
    const source = await readFile(new URL('../src/components/NoteList.jsx', import.meta.url), 'utf8')

    assert.equal(source.includes('const handleDeleteFolder = async (id) => {'), true)
    assert.equal(source.includes('const isConfirmed = await showConfirm({'), true)
    assert.equal(source.includes('const isConfirmed = await confirm({'), false)
})
