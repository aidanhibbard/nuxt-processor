import { useNuxt } from '@nuxt/kit'
import { scanWorkerFiles } from './scan-worker-files'
import { logger } from './logger'

// Credit for this code to
// https://github.com/genu/nuxt-concierge/blob/master/src/helplers/scan-folder.ts

export interface ScanFolderOptions {
  /** Path to the workers directory, relative to the project root. */
  path: string
  pattern?: string
}

export default async ({ path, pattern = '**/*.{ts,js,mjs}' }: ScanFolderOptions): Promise<string[]> => {
  const nuxt = useNuxt()

  const files = await scanWorkerFiles({
    rootDir: nuxt.options.rootDir,
    workersPath: path,
    pattern,
  })

  if (files.length === 0) {
    logger.warn('No worker files found in project')
  }

  return files
}
