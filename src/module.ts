import { join } from 'node:path'
import fs from 'node:fs/promises'
import { defineNuxtModule, createResolver, useLogger, addServerImportsDir } from '@nuxt/kit'
import defu from 'defu'
import { globby } from 'globby'
import type { InlineConfig } from 'vite'
import { build as viteBuild } from 'vite'
import type { RedisOptions } from 'bullmq'
import { name, version, configKey, compatibility } from '../package.json'

export interface ModuleOptions {
  workers?: string | string[]
  queues?: string | string[]
  redis: RedisOptions
}

export default defineNuxtModule<ModuleOptions>({
  meta: { name, configKey, version, compatibility },
  defaults: {
    workers: 'server/workers/**/*.{ts,js}',
    queues: 'server/queues/**/*.{ts,js}',
    redis: { host: '127.0.0.1', port: 6379 },
  },
  async setup(options, nuxt) {
    const logger = useLogger(name)
    const { resolve } = createResolver(import.meta.url)

    nuxt.options.runtimeConfig.workers = defu(
      nuxt.options.runtimeConfig.workers,
      options,
    )

    addServerImportsDir(resolve('./runtime/server/utils'))

    nuxt.hook('build:done', async () => {
      const workerFiles = await globby(options.workers!, {
        cwd: nuxt.options.srcDir,
        absolute: true,
      })

      if (!workerFiles.length) {
        logger.info('No workers found to bundle.')
        return
      }

      const imports = workerFiles.map((absPath, i) =>
        `import worker${i} from ${JSON.stringify(absPath)};`,
      ).join('\n')

      const runners = workerFiles.map((_, i) =>
        `worker${i}.run();`,
      ).join('\n')

      const entryContent = `${imports}\n\n${runners}\n`

      const tempEntryPath = join(nuxt.options.buildDir, 'workers-entry.mjs')
      await fs.writeFile(tempEntryPath, entryContent)

      const outDir = nuxt.options.dev
        ? join(nuxt.options.buildDir, 'dist/server')
        : join(nuxt.options.rootDir, '.output/server')

      const viteConfig: InlineConfig = {
        root: nuxt.options.rootDir,
        configFile: false,
        ssr: {
          noExternal: true,
        },
        build: {
          ssr: true,
          target: 'es2020',
          outDir,
          emptyOutDir: false,
          rollupOptions: {
            input: tempEntryPath,
            output: {
              format: 'esm',
              entryFileNames: 'workers.mjs',
              inlineDynamicImports: true,
            },
          },
        },
      }

      try {
        await viteBuild(viteConfig)
        logger.success(`Bundled standalone workers at ${join(outDir, 'workers.mjs')}`)
      }
      catch (err) {
        logger.error(`Failed to bundle workers.mjs: ${err}`)
      }
    })
  },
})
