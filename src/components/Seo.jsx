import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Client-seitige Titel-/Meta-/Canonical-Updates (VITE_SITE_URL für absolute Canonical-URL).
 */
export default function Seo({ title, description, noindex, canonicalPath }) {
  const { pathname } = useLocation()
  const base = String(import.meta.env.VITE_SITE_URL || '').replace(/\/+$/, '')
  const path = canonicalPath != null ? canonicalPath : pathname
  const canonicalUrl = base ? `${base}${path.startsWith('/') ? path : `/${path}`}` : ''

  useEffect(() => {
    document.title = title

    if (description != null && description !== '') {
      let meta = document.querySelector('meta[name="description"]')
      if (!meta) {
        meta = document.createElement('meta')
        meta.setAttribute('name', 'description')
        document.head.appendChild(meta)
      }
      meta.setAttribute('content', description)
    }

    let robots = document.querySelector('meta[name="robots"]')
    if (noindex) {
      if (!robots) {
        robots = document.createElement('meta')
        robots.setAttribute('name', 'robots')
        document.head.appendChild(robots)
      }
      robots.setAttribute('content', 'noindex, nofollow')
    } else if (robots?.getAttribute('content') === 'noindex, nofollow') {
      robots.remove()
    }

    if (canonicalUrl) {
      let link = document.querySelector('link[rel="canonical"]')
      if (!link) {
        link = document.createElement('link')
        link.rel = 'canonical'
        document.head.appendChild(link)
      }
      link.href = canonicalUrl
    }
  }, [title, description, noindex, canonicalUrl])

  return null
}
