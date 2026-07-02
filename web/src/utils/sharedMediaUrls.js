function normalizedOrigin(origin = '') {
  return String(origin || '').trim().replace(/\/+$/, '')
}

function uploadsUrl(pathname = '', search = '', hash = '', origin = '') {
  const base = normalizedOrigin(origin)
  const normalizedPath = pathname.replace(/^\/api\/uploads\//i, '/uploads/')
  const suffix = `${normalizedPath}${search}${hash}`
  return base ? `${base}${suffix}` : suffix
}

export function resolveSharedMediaUrl(value = '', origin = '') {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (/^(?:data:|blob:)/i.test(raw)) return raw

  try {
    if (/^https?:\/\//i.test(raw)) {
      const parsed = new URL(raw)
      const uploadIndex = parsed.pathname.search(/\/(?:api\/)?uploads\//i)
      if (uploadIndex >= 0) {
        const uploadPath = parsed.pathname.slice(uploadIndex)
        return uploadsUrl(uploadPath, parsed.search, parsed.hash, origin)
      }
      return raw
    }

    if (/^\/?api\/uploads\//i.test(raw)) {
      return uploadsUrl(raw.startsWith('/') ? raw : `/${raw}`, '', '', origin)
    }

    if (/^\/?uploads\//i.test(raw)) {
      return uploadsUrl(raw.startsWith('/') ? raw : `/${raw}`, '', '', origin)
    }

    return raw
  } catch {
    return raw
  }
}

export function normalizeSharedHtmlMediaUrls(html = '', origin = '') {
  return String(html || '').replace(
    /\b(src|href)=("([^"]*)"|'([^']*)')/gi,
    (match, attr, quoted, doubleValue, singleValue) => {
      const quote = quoted.startsWith('"') ? '"' : "'"
      const value = doubleValue ?? singleValue ?? ''
      const normalized = resolveSharedMediaUrl(value, origin)
      return `${attr}=${quote}${normalized}${quote}`
    },
  )
}
