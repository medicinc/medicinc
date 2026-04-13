import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const siteUrl = (env.VITE_SITE_URL || 'https://example.com').replace(/\/+$/, '')

  const orgJson = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Medic Inc',
    url: siteUrl,
    logo: `${siteUrl}/favicon.svg`,
    description:
      'Medizinische Lern- und Trainingssimulation mit KI-gestütztem Patientenchat, Krankenhaus- und Rettungsdienst-Szenarien. Kein Echtbetrieb.',
  }

  const webJson = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Medic Inc',
    url: siteUrl,
    inLanguage: 'de-DE',
  }

  const appJson = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Medic Inc',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
    url: siteUrl,
  }

  const ldScripts = [orgJson, webJson, appJson]
    .map((obj) => `    <script type="application/ld+json">${JSON.stringify(obj)}</script>`)
    .join('\n')

  /** consentmanager CMP – muss per Vite-Tags injiziert werden, sonst fehlt es im dist/index.html */
  const consentManagerTags = [
    {
      tag: 'script',
      attrs: {
        type: 'text/javascript',
        'data-cmp-ab': '1',
        src: 'https://cdn.consentmanager.net/delivery/autoblocking/663c35cbb2c06.js',
        'data-cmp-host': 'b.delivery.consentmanager.net',
        'data-cmp-cdn': 'cdn.consentmanager.net',
        'data-cmp-codesrc': '0',
      },
      injectTo: 'head-prepend',
    },
  ]

  return {
    plugins: [
      react(),
      {
        name: 'seo-inject-index-html',
        transformIndexHtml(html) {
          const replaced = html.replace(/%SITE_URL%/g, siteUrl).replace('</head>', `${ldScripts}\n  </head>`)
          return {
            html: replaced,
            tags: consentManagerTags,
          }
        },
      },
    ],
    server: {
      port: 3000,
      open: true,
    },
  }
})
