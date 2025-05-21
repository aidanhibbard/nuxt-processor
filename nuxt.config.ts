// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/test-utils'],
  future: {
    compatibilityVersion: 4,
  },
  compatibilityDate: '2025-04-28',
  typescript: {
    strict: true,
  },
  eslint: {
    config: {
      stylistic: {
        quotes: 'single',
      },
    },
    checker: true,
  },
})
