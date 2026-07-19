import fg from 'fast-glob'
import { resolve } from 'pathe'

export interface ScanWorkerFilesOptions {
  rootDir: string
  /** Path to the workers directory, relative to the project root. */
  workersPath: string
  pattern?: string
}

export async function scanWorkerFiles({
  rootDir,
  workersPath,
  pattern = '**/*.{ts,js,mjs}',
}: ScanWorkerFilesOptions): Promise<string[]> {
  const resolvedPath = resolve(rootDir, workersPath)

  const files = await fg(pattern, {
    cwd: resolvedPath,
    absolute: true,
    onlyFiles: true,
  })

  return [...new Set(files)]
}
