// Ripped from https://github.com/nuxt/telemetry/blob/main/src/cli.ts#L161C1-L172C2
import { resolve } from 'pathe'
import { loadNuxtConfig } from '@nuxt/kit'
import { logger } from './logger'

export default async (args: { global: boolean, dir: string }) => {
  if (args.global) {
    return
  }
  const dir = resolve(args.dir)
  const nuxtConfig = await loadNuxtConfig({ cwd: dir })
  if (!nuxtConfig || !nuxtConfig._layers[0]?.configFile) {
    logger.error('You are not in a Nuxt project.')
    process.exit(1)
  }
}
