export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxtjs/supabase',
    '@vite-pwa/nuxt',
    '@nuxtjs/sitemap',
    'nuxt-gtag'
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

  gtag: {
    id: 'G-NTWMKJ22YG',
    initCommands: [
      ['consent', 'default', {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        analytics_storage: 'denied'
      }]
    ]
  },

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      title: 'Deskover — Les meilleurs spots pour bosser',
      htmlAttrs: { lang: 'fr' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'description', content: 'Trouve le spot parfait pour bosser en 10 secondes. WiFi, prises, ambiance — on a tout testé, ville par ville.' },
        { name: 'theme-color', content: '#AA4C4D' },
        { property: 'og:title', content: 'Deskover — Les meilleurs spots pour bosser' },
        { property: 'og:description', content: 'Trouve le spot parfait pour bosser en 10 secondes. WiFi, prises, ambiance — on a tout testé, ville par ville.' },
        { property: 'og:type', content: 'website' },
        { name: 'google-site-verification', content: 'A4gym-1WU4NwHLqNi4MqvQI49W7845e2989tPtbD3PM' },
        { property: 'og:image', content: 'https://www.deskover.fr/og-default.png' },
        { property: 'og:locale', content: 'fr_FR' },
        { property: 'og:site_name', content: 'Deskover' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:site', content: '@deskover_fr' },
        { name: 'twitter:title', content: 'Deskover — Les meilleurs spots pour bosser' },
        { name: 'twitter:description', content: 'Trouve le spot parfait pour bosser en 10 secondes. WiFi, prises, ambiance — on a tout testé, ville par ville.' },
        { name: 'twitter:image', content: 'https://www.deskover.fr/og-default.png' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico', sizes: 'any' },
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
