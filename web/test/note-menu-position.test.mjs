import test from 'node:test'
import assert from 'node:assert/strict'

import { computeFloatingMenuPosition } from '../src/utils/noteMenuPosition.js'

test('底部空间不足时菜单应自动向上展开', () => {
    const result = computeFloatingMenuPosition(
        { top: 560, bottom: 592, right: 920 },
        { width: 196, height: 420 },
        { width: 1440, height: 720 }
    )

    assert.equal(result.placement, 'top')
    assert.ok(result.top < 560)
})

test('菜单位置应被限制在视口内，避免触发页面跳动', () => {
    const result = computeFloatingMenuPosition(
        { top: 22, bottom: 54, right: 1400 },
        { width: 260, height: 800 },
        { width: 1440, height: 720 }
    )

    assert.ok(result.top >= 12)
    assert.ok(result.left >= 12)
    assert.ok(result.left <= 1440 - 260 - 12)
})
