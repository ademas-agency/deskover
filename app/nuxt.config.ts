export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxtjs/supabase',
    '@vite-pwa/nuxt',
    '@nuxtjs/sitemap'
  ],

  site: {
    url: 'https://www.deskover.fr',
    name: 'Deskover'
  },

  sitemap: {
    sources: ['/api/__sitemap__/urls']
  },

  pwa: {
    manifest: false,
    devOptions: { enabled: false },
    workbox: {
      navigateFallback: undefined,
      globPatterns: ['**/*.{js,css,html,svg,ico,woff2}'],
      maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
    },
  },

  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    redirect: false
  },

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      title: 'Deskover — Trouve ton spot pour bosser',
      htmlAttrs: { lang: 'fr' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'description', content: 'Deskover sélectionne les meilleurs endroits pour travailler : cafés, bibliothèques, coworkings. WiFi, prises, ambiance — tout est noté.' },
        { name: 'theme-color', content: '#AA4C4D' },
        { property: 'og:title', content: 'Deskover — Trouve ton spot pour bosser' },
        { property: 'og:description', content: 'Les meilleurs spots pour bosser, sélectionnés pour toi.' },
        { property: 'og:type', content: 'website' },
        { name: 'google-site-verification', content: 'A4gym-1WU4NwHLqNi4MqvQI49W7845e2989tPtbD3PM' },
        { property: 'og:image', content: 'https://www.deskover.fr/og-default.png' },
        { property: 'og:locale', content: 'fr_FR' },
        { property: 'og:site_name', content: 'Deskover' }
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'manifest', href: '/manifest.json' },
        { rel: 'apple-touch-icon', href: '/icon-192.png' }
      ]
    },
    pageTransition: { name: 'page', mode: 'out-in' }
  },

  routeRules: {
    '/': { prerender: true },
  },

  compatibilityDate: '2025-01-15',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
