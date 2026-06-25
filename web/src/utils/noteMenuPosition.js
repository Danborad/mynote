const VIEWPORT_PADDING = 12
const MENU_GAP = 8

export function computeFloatingMenuPosition(anchorRect, menuSize, viewportSize, options = {}) {
    const padding = options.padding ?? VIEWPORT_PADDING
    const gap = options.gap ?? MENU_GAP

    const menuWidth = Math.min(menuSize.width, Math.max(0, viewportSize.width - padding * 2))
    const menuHeight = Math.min(menuSize.height, Math.max(0, viewportSize.height - padding * 2))

    const spaceBelow = viewportSize.height - anchorRect.bottom - padding
    const spaceAbove = anchorRect.top - padding
    const placeAbove = spaceBelow < menuHeight + gap && spaceAbove > spaceBelow

    let top = placeAbove
        ? anchorRect.top - menuHeight - gap
        : anchorRect.bottom + gap

    let left = anchorRect.right - menuWidth

    top = Math.min(Math.max(top, padding), Math.max(padding, viewportSize.height - menuHeight - padding))
    left = Math.min(Math.max(left, padding), Math.max(padding, viewportSize.width - menuWidth - padding))

    return {
        top,
        left,
        maxHeight: Math.max(160, viewportSize.height - padding * 2),
        placement: placeAbove ? 'top' : 'bottom',
    }
}

export { MENU_GAP, VIEWPORT_PADDING }
