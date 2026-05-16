import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base: '/nuxt-processor/',
  title: 'Nuxt Processor',
  description: 'Dedicated processing for Nuxt apps',
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Getting Started', link: '/getting-started' },
      { text: 'API', link: '/api' },
      { text: 'Redis', link: '/redis' },
    ],

    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/getting-started' },
          { text: 'Redis configuration', link: '/redis' },
          { text: 'Define Queue', link: '/define-queue' },
          { text: 'Define Worker', link: '/define-worker' },
          { text: 'Bull Board', link: '/bull-board' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'API', link: '/api' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/aidanhibbard/nuxt-processor' },
    ],
  },
})
