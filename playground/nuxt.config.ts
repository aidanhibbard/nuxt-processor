export default defineNuxtConfig({
  modules: ['../src/module'],
  devtools: { enabled: true },
  runtimeConfig: {
    workers: {},
  },
  future: {
    compatibilityVersion: 4,
  },
  compatibilityDate: '2025-04-28',
  typescript: {
    strict: true,
  },
})
