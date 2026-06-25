import { Client } from 'pg'

const databaseUrl = process.env.DATABASE_URL || 'postgresql://mynote:mynote_secret@localhost:5432/mynote'

const normalizeUrlString = (value = '') => {
  if (!value) return value

  return String(value)
    .replace(/https?:\/\/[^"'\s<>]+\/api\/uploads\//gi, '/uploads/')
    .replace(/https?:\/\/[^"'\s<>]+\/uploads\//gi, '/uploads/')
    .replace(/(["'])api\/uploads\//gi, '$1/uploads/')
    .replace(/(["'])\/api\/uploads\//gi, '$1/uploads/')
    .replace(/(["'])uploads\//gi, '$1/uploads/')
}

const normalizeAttachments = (attachments) => {
  if (!Array.isArray(attachments)) return attachments
  return attachments.map((item) => {
    if (typeof item !== 'string') return item
    return normalizeUrlString(item)
  })
}

const hasContentCandidate = (content = '') => {
  return /uploads\//i.test(content) || /https?:\/\/[^"'\s<>]+\/(?:api\/)?uploads\//i.test(content)
}

const run = async () => {
  const client = new Client({ connectionString: databaseUrl })
  await client.connect()

  try {
    const { rows } = await client.query('SELECT id, content, attachments FROM notes')

    let checked = 0
    let changed = 0

    for (const row of rows) {
      checked += 1

      const beforeContent = row.content || ''
      const beforeAttachments = Array.isArray(row.attachments) ? row.attachments : row.attachments

      if (!hasContentCandidate(beforeContent) && !Array.isArray(beforeAttachments)) {
        continue
      }

      const nextContent = normalizeUrlString(beforeContent)
      const nextAttachments = normalizeAttachments(beforeAttachments)

      const contentChanged = nextContent !== beforeContent
      const attachmentsChanged = JSON.stringify(nextAttachments) !== JSON.stringify(beforeAttachments)

      if (!contentChanged && !attachmentsChanged) {
        continue
      }

      await client.query('UPDATE notes SET content = $1, attachments = $2, updated_at = NOW() WHERE id = $3', [
        nextContent,
        nextAttachments,
        row.id,
      ])

      changed += 1
    }

    console.log(`[normalize-media-urls] checked=${checked} changed=${changed}`)
  } finally {
    await client.end()
  }
}

run().catch((error) => {
  console.error('[normalize-media-urls] failed:', error)
  process.exit(1)
})
