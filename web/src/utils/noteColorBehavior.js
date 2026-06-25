export const NOTE_COLORS = [
    { id: 'reset', name: '默认', label: '恢复默认', value: null, light: null, dark: null },
    { id: 'sunrise', name: '晨曦', label: '晨曦', value: 'sunrise', light: 'linear-gradient(135deg, #d7ebf3 0%, #9fc7d8 100%)', dark: 'linear-gradient(135deg, #1e2a3a 0%, #162030 100%)' },
    { id: 'peach', name: '蜜桃', label: '蜜桃', value: 'peach', light: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', dark: 'linear-gradient(135deg, #2d1f1f 0%, #3d1a2a 100%)' },
    { id: 'lavender', name: '薰衣草', label: '薰衣草', value: 'lavender', light: 'linear-gradient(135deg, #cfcaf6 0%, #93a9ec 100%)', dark: 'linear-gradient(135deg, #1e1830 0%, #141a2e 100%)' },
    { id: 'mint', name: '薄荷', label: '薄荷', value: 'mint', light: 'linear-gradient(135deg, #c8ead7 0%, #86c5b2 100%)', dark: 'linear-gradient(135deg, #14332a 0%, #1b4740 100%)' },
    { id: 'ocean', name: '海洋', label: '海洋', value: 'ocean', light: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', dark: 'linear-gradient(135deg, #111a30 0%, #1a1028 100%)' },
    { id: 'sunset', name: '日落', label: '日落', value: 'sunset', light: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', dark: 'linear-gradient(135deg, #2a0f1a 0%, #2a1a05 100%)' },
    { id: 'aurora', name: '极光', label: '极光', value: 'aurora', light: 'linear-gradient(135deg, #c4e4de 0%, #c3d9d6 100%)', dark: 'linear-gradient(135deg, #102020 0%, #2a0f20 100%)' },
    { id: 'galaxy', name: '星空', label: '星空', value: 'galaxy', light: 'linear-gradient(135deg, #2c3e50 0%, #4ca1af 100%)', dark: 'linear-gradient(135deg, #0a0a0f 0%, #0f1a20 100%)' },
]

export function applyLocalNoteColorChange(note, color) {
    return {
        ...note,
        color: color || null,
    }
}

export function buildNoteColorMenuItems(currentColor) {
    return NOTE_COLORS.map((color) => ({
        ...color,
        selected: currentColor === color.value,
    }))
}

export function mergeColorChangePreservingMetadata(currentNote, nextNote) {
    if (!currentNote) return nextNote
    if (!nextNote) return currentNote

    return {
        ...nextNote,
        updatedAt: currentNote.updatedAt,
        createdAt: currentNote.createdAt,
    }
}
