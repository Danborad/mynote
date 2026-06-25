import test from 'node:test'
import assert from 'node:assert/strict'

import { lockBodyScroll } from '../src/utils/bodyScrollLock.js'

test('锁定 body 滚动时应补偿滚动条宽度，避免布局跳动', () => {
    const bodyStyle = { overflow: '', paddingRight: '' }

    global.window = { innerWidth: 1200 }
    global.document = {
        body: { style: bodyStyle },
        documentElement: { clientWidth: 1184 },
    }

    const unlock = lockBodyScroll()

    assert.equal(bodyStyle.overflow, 'hidden')
    assert.equal(bodyStyle.paddingRight, '16px')

    unlock()

    assert.equal(bodyStyle.overflow, '')
    assert.equal(bodyStyle.paddingRight, '')
})
