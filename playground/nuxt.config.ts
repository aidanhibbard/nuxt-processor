export default defineNuxtConfig({
  modules: ['../src/module'],
  devtools: { enabled: true },
  typescript: {
    strict: true,
    typeCheck: true,
  },
})
