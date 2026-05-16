export default defineNuxtConfig({
  modules: ['../src/module'],
  devtools: { enabled: true },
  compatibilityDate: '2026-05-16',
  typescript: {
    strict: true,
    typeCheck: true,
  },
})
