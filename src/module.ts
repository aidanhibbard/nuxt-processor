import { defineNuxtModule, addPlugin, createResolver, useLogger, addServerImportsDir, addTemplate } from '@nuxt/kit'
import type { RedisOptions } from 'bullmq'
import defu from 'defu'
import { globby } from 'globby'
import { name, version, configKey, compatibility } from '../package.json'

// Module options TypeScript interface definition
export interface ModuleOptions {
  workers?: string | string[]
  queues?: string | string[]
  redis: RedisOptions
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name,
    configKey,
    version,
    compatibility,
  },
  // Default configuration options of the Nuxt module
  defaults: {
    workers: 'server/workers/**/*',
    queues: 'server/queues/**/*',
    redis: { host: '127.0.0.1', port: 6379 },
  },
  async setup(options, nuxt) {
    const { resolve } = createResolver(import.meta.url)
    const logger = useLogger(name)

    // Do not add the extension since the `.ts` will be transpiled to `.mjs` after `npm run prepack`
    addPlugin(resolve('./runtime/plugin'))

    nuxt.options.runtimeConfig.workers = defu(
      nuxt.options.runtimeConfig.workers,
      options,
    )

    addServerImportsDir(resolve('./runtime/server/utils'))
  },
})
