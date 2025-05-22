import { join, relative } from 'node:path'
import fs from 'node:fs/promises'
import { defineNuxtModule, addPlugin, createResolver, useLogger, addServerImportsDir } from '@nuxt/kit'
import defu from 'defu'
import { globby } from 'globby'
import type { RedisOptions } from 'bullmq'
import { name, version, configKey, compatibility } from '../package.json'

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
  defaults: {
    workers: 'server/workers/**/*',
    queues: 'server/queues/**/*',
    redis: { host: '127.0.0.1', port: 6379 },
  },
  async setup(options, nuxt) {
    const { resolve } = createResolver(import.meta.url)
    const logger = useLogger(name)

    addPlugin(resolve('./runtime/plugin'))

    nuxt.options.runtimeConfig.workers = defu(
      nuxt.options.runtimeConfig.workers,
      options,
    )

    addServerImportsDir(resolve('./runtime/server/utils'))

    nuxt.hook('builder:watch', async () => {
      const workerFiles = await globby(options.workers ?? 'server/workers/**/*.{ts,js}', {
        cwd: nuxt.options.srcDir,
      })

      const imports = workerFiles.map((file, index) => {
        const importPath = relative(nuxt.options.srcDir, join(nuxt.options.srcDir, file)).replace(/\\/g, '/')
        return `import worker${index} from './${importPath}'`
      }).join('\n')

      const exports = workerFiles.map((_, index) => `  worker${index}`).join(',\n')

      const content = `${imports}\n\nexport default [\n${exports}\n]`

      const outputDir = join(nuxt.options.rootDir, '.output')
      const outputFile = join(outputDir, 'workers.mjs')

      try {
        await fs.mkdir(outputDir)
        await fs.writeFile(outputFile, content)
        logger.success(`Generated workers.mjs at ${outputFile}`)
      }
      catch (error) {
        logger.error(`Failed to write workers.mjs: ${error}`)
      }
    })
  },
})
