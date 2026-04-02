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

  return {
    plugins: [
      react(),
      {
        name: 'seo-inject-index-html',
        transformIndexHtml(html) {
          return html.replace(/%SITE_URL%/g, siteUrl).replace('</head>', `${ldScripts}\n  </head>`)
        },
      },
    ],
    server: {
      port: 3000,
      open: true,
    },
  }
})
