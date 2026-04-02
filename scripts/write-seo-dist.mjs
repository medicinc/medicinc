import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

function readViteSiteUrl() {
  if (process.env.VITE_SITE_URL) {
    return String(process.env.VITE_SITE_URL).trim().replace(/^["']|["']$/g, '')
  }
  for (const name of ['.env.local', '.env']) {
    const p = path.join(root, name)
    if (!fs.existsSync(p)) continue
    const text = fs.readFileSync(p, 'utf8')
    const m = text.match(/^\s*VITE_SITE_URL\s*=\s*(.+)$/m)
    if (m) return m[1].trim().replace(/^["']|["']$/g, '')
  }
  return ''
}

const raw = readViteSiteUrl()
const base = (raw || 'https://example.com').replace(/\/+$/, '')
if (!raw) {
  console.warn('[seo] VITE_SITE_URL nicht gesetzt – verwende https://example.com in sitemap/robots (bitte in .env setzen).')
}

const paths = [
  '/',
  '/login',
  '/register',
  '/register-gate',
  '/impressum',
  '/datenschutz',
  '/nutzungsbedingungen',
  '/widerruf-digital',
  '/ai-hinweise',
  '/jugendschutz',
  '/community-regeln',
]

const dist = path.join(root, 'dist')
if (!fs.existsSync(dist)) {
  console.error('[seo] dist/ fehlt – zuerst vite build ausführen.')
  process.exit(1)
}

const lastmod = new Date().toISOString().slice(0, 10)
const loc = (p) => `${base}${p === '/' ? '/' : p}`
const urls = paths
  .map(
    (p) => `  <url>
    <loc>${loc(p)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${p === '/' ? '1.0' : '0.6'}</priority>
  </url>`,
  )
  .join('\n')

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
fs.writeFileSync(path.join(dist, 'sitemap.xml'), sitemap, 'utf8')

const robots = `User-agent: *
Allow: /
Sitemap: ${base}/sitemap.xml
`
fs.writeFileSync(path.join(dist, 'robots.txt'), robots, 'utf8')
console.log('[seo] dist/sitemap.xml und dist/robots.txt geschrieben (Basis:', `${base}).`)
