import { chromium } from "playwright"
import { spawn } from "node:child_process"

const url = process.argv[2] || "http://127.0.0.1:4173"
const startedServer = { process: null }

async function canReach(targetUrl) {
  try {
    const response = await fetch(targetUrl, { method: 'HEAD' })
    return response.ok || response.status < 500
  } catch {
    return false
  }
}

async function waitForServer(targetUrl, timeoutMs = 15000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    if (await canReach(targetUrl)) return true
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  return false
}

if (!(await canReach(url))) {
  startedServer.process = spawn('bunx', ['--bun', 'vite', 'preview', '--host', '127.0.0.1', '--port', '4173'], {
    stdio: 'ignore',
  })

  const ready = await waitForServer(url)
  if (!ready) {
    startedServer.process.kill('SIGTERM')
    throw new Error(`无法启动 Web 预览服务: ${url}`)
  }
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1912, height: 1038 }, colorScheme: "dark" })

const failures = []
const screenshots = []

async function snap(name) {
  const path = `playwright-${name}.png`
  await page.screenshot({ path, fullPage: false, timeout: 60000 })
  screenshots.push(path)
}

function pushFailure(message) {
  failures.push(message)
  console.error(message)
}

await page.goto(url, { waitUntil: "networkidle" })
await page.evaluate(() => {
  localStorage.setItem('themeMode', 'dark')
})
await page.reload({ waitUntil: 'networkidle' })
await snap('home-dark')

const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
if (bodyBg === 'rgb(255, 255, 255)' || bodyBg === 'rgba(255, 255, 255, 1)') {
  pushFailure(`body 背景仍然是白色: ${bodyBg}`)
}

const brightPanels = await page.evaluate(() => {
  const nodes = Array.from(document.querySelectorAll('div,button,section,aside,header,main')).slice(0, 700)
  return nodes.map((node) => {
    const style = getComputedStyle(node)
    const bg = style.backgroundColor
    const rect = node.getBoundingClientRect()
    const visible = rect.width > 40 && rect.height > 32
    return { bg, text: (node.textContent || '').trim().slice(0, 40), visible }
  }).filter((item) => item.visible && (item.bg === 'rgb(255, 255, 255)' || item.bg === 'rgba(255, 255, 255, 1)')).slice(0, 12)
})

if (brightPanels.length) {
  pushFailure(`发现深色模式可见纯白块: ${JSON.stringify(brightPanels)}`)
}

const shareButton = page.getByText('分享链接').first()
if (await shareButton.count()) {
  await shareButton.click()
  await page.waitForTimeout(500)
  await snap('shares-dark')

  const overlayBg = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('[aria-label="关闭分享链接管理"]')).find(Boolean)
    return el ? getComputedStyle(el).backgroundColor : null
  })

  if (!overlayBg || overlayBg === 'rgba(0, 0, 0, 0)' || overlayBg === 'rgba(2, 8, 20, 0.26)') {
    pushFailure(`分享链接遮罩颜色异常: ${overlayBg}`)
  }
}

await browser.close()
if (startedServer.process) {
  startedServer.process.kill('SIGTERM')
}

if (failures.length) {
  console.error(`\nPlaywright 检查失败，共 ${failures.length} 项`)
  process.exit(1)
}

console.log(JSON.stringify({ ok: true, screenshots }, null, 2))
