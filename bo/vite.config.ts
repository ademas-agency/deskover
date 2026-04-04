import { defineConfig, type PluginOption } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'
import type { IncomingMessage, ServerResponse } from 'http'

const ARTICLES_DIR = path.resolve(__dirname, '..', 'app', 'content', 'articles')

// Plugin to serve data files from ../scripts/data/
function serveDataPlugin(): PluginOption {
  return {
    name: 'serve-data',
    configureServer(server) {
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (req.url && req.url.startsWith('/data/')) {
          const fileName = req.url.replace('/data/', '').split('?')[0]
          const filePath = path.resolve(__dirname, '..', 'scripts', 'data', fileName)
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            res.setHeader('Content-Type', 'application/json')
            res.setHeader('Access-Control-Allow-Origin', '*')
            fs.createReadStream(filePath).pipe(res)
            return
          }
        }
        next()
      })
    },
  }
}

// Plugin API to manage article cleanup when deleting a place
function articleApiPlugin(): PluginOption {
  return {
    name: 'article-api',
    configureServer(server) {
      // GET /api/articles/check-place?placeId=xxx — find articles referencing a place
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (!req.url?.startsWith('/api/articles/')) return next()

        const url = new URL(req.url, 'http://localhost')

        if (req.method === 'GET' && url.pathname === '/api/articles/check-place') {
          const placeId = url.searchParams.get('placeId')
          if (!placeId) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'placeId required' }))
            return
          }

          const results = findArticlesWithPlace(placeId)
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(results))
          return
        }

        if (req.method === 'POST' && url.pathname === '/api/articles/remove-place') {
          let body = ''
          req.on('data', (chunk) => { body += chunk })
          req.on('end', () => {
            try {
              const { placeId } = JSON.parse(body)
              if (!placeId) {
                res.writeHead(400, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ error: 'placeId required' }))
                return
              }
              const removed = removePlaceFromArticles(placeId)
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ removed }))
            } catch {
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Invalid request' }))
            }
          })
          return
        }

        next()
      })
    },
  }
}

function getArticleFiles(): string[] {
  if (!fs.existsSync(ARTICLES_DIR)) return []
  return fs.readdirSync(ARTICLES_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => path.join(ARTICLES_DIR, f))
}

function findArticlesWithPlace(placeId: string): { file: string; slug: string }[] {
  const results: { file: string; slug: string }[] = []
  for (const filePath of getArticleFiles()) {
    const content = fs.readFileSync(filePath, 'utf-8')
    if (content.includes(placeId)) {
      const slug = path.basename(filePath, '.md')
      results.push({ file: filePath, slug })
    }
  }
  return results
}

function removePlaceFromArticles(placeId: string): string[] {
  const removed: string[] = []

  for (const filePath of getArticleFiles()) {
    let content = fs.readFileSync(filePath, 'utf-8')
    if (!content.includes(placeId)) continue

    const slug = path.basename(filePath, '.md')

    // 1. Remove place ID from frontmatter places array
    content = content.replace(
      /^(---\n[\s\S]*?places:\s*\[)([\s\S]*?)(\][\s\S]*?---)/m,
      (match, before, list, after) => {
        const ids = list.split(',')
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0 && !s.includes(placeId))
        return `${before}${ids.join(', ')}${after}`
      }
    )

    // 2. Remove the place section: ## Heading + paragraphs + ::place-embed{id="..."}::
    //    Pattern: from the ## heading above the embed to the next ## or --- or end
    const embedPattern = `::place-embed\\{id="${placeId}"\\}\\n::`
    const embedRegex = new RegExp(embedPattern)

    if (embedRegex.test(content)) {
      // Split into lines and find the embed
      const lines = content.split('\n')
      let embedLineIdx = -1
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(`::place-embed{id="${placeId}"}`)) {
          embedLineIdx = i
          break
        }
      }

      if (embedLineIdx >= 0) {
        // Find the ## heading above this embed
        let sectionStart = embedLineIdx
        for (let i = embedLineIdx - 1; i >= 0; i--) {
          if (lines[i].startsWith('## ')) {
            sectionStart = i
            break
          }
        }

        // The section ends after the :: closing line
        let sectionEnd = embedLineIdx + 1
        if (sectionEnd < lines.length && lines[sectionEnd].trim() === '::') {
          sectionEnd += 1
        }
        // Skip trailing blank line
        if (sectionEnd < lines.length && lines[sectionEnd].trim() === '') {
          sectionEnd += 1
        }

        lines.splice(sectionStart, sectionEnd - sectionStart)
        content = lines.join('\n')
      }
    }

    fs.writeFileSync(filePath, content, 'utf-8')
    removed.push(slug)
  }

  return removed
}

export default defineConfig({
  plugins: [vue(), tailwindcss(), serveDataPlugin(), articleApiPlugin()],
  server: {
    port: 5174,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
