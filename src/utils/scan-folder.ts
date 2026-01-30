import fg from 'fast-glob'
import { createResolver, useNuxt } from '@nuxt/kit'
import { logger } from './logger'

// Credit for this code to
// https://github.com/genu/nuxt-concierge/blob/master/src/helplers/scan-folder.ts

export default async (path: string): Promise<string[]> => {
  const nuxt = useNuxt()
  const { resolve } = createResolver(import.meta.url)
  // https://github.com/genu/nuxt-concierge/issues/8
  const resolvedPath = resolve(nuxt.options.rootDir, path)

  const files: string[] = []

  const updatedFiles = await fg('**/*.{ts,js,mjs}', {
    cwd: resolvedPath,
    absolute: true,
    onlyFiles: true,
  })

  files.push(...new Set(updatedFiles))

  if (files.length === 0) {
    logger.warn('No worker files found in project')
  }

  return files
}
