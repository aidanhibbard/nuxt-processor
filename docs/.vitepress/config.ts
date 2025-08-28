import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'Nuxt Processor',
  description: 'Dedicated processing for Nuxt apps',
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Getting Started', link: '/getting-started' },
      { text: 'Define Worker', link: '/define-worker' },
      { text: 'Define Queue', link: '/define-queue' },
    ],

    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/getting-started' },
          { text: 'Define Worker', link: '/define-worker' },
          { text: 'Define Queue', link: '/define-queue' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/aidanhibbard/nuxt-processor' },
    ],
  },
})
