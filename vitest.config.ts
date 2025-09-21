import { defaultExclude, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['spec/**/*.spec.ts'],
    globals: true,
    coverage: {
      exclude: [
        'playground',
        ...defaultExclude,
        '.nuxt',
        'dist',
        'node_modules',
        'bin',
        'coverage',
        'spec',
        'docs',
      ],
    },
  },
})
