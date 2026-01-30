import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { resolve } from 'pathe'

import { logger } from './logger'

const PROCESSOR_DEV_SCRIPT = 'nuxt-processor dev'

/**
 * Ensures package.json has a "processor:dev" script. If missing, optionally prompts
 * and adds it. Returns true if the script exists (or was added), false otherwise.
 */
export async function ensureProcessorDevScript(
  projectRoot: string,
  options?: {
    /** Inject for testing; if not provided, uses readline to prompt. */
    ask?: () => Promise<string>
  },
): Promise<boolean> {
  const pkgPath = resolve(projectRoot, 'package.json')
  if (!existsSync(pkgPath)) {
    return false
  }

  let pkg: { scripts?: Record<string, string> }
  try {
    const pkgRaw = JSON.parse(readFileSync(pkgPath, 'utf8')) as unknown
    pkg = pkgRaw as { scripts?: Record<string, string> }
  }
  catch (error) {
    logger.error('Failed to parse', error)
    return false
  }

  if (pkg?.scripts?.['processor:dev']) {
    return true
  }

  logger.warn('No "processor:dev" script found in package.json.')

  const answer = options?.ask
    ? await options.ask()
    : await createInterface({ input, output }).question('Add script to package.json? (y/N) ')

  const isYes = typeof answer === 'string' && /^y(?:es)?$/i.test(answer.trim())
  if (!isYes) {
    return false
  }

  const updated = {
    ...pkg,
    scripts: {
      ...(pkg.scripts ?? {}),
      'processor:dev': PROCESSOR_DEV_SCRIPT,
    },
  }

  try {
    writeFileSync(pkgPath, JSON.stringify(updated, null, 2) + '\n', 'utf8')
    logger.success('Added "processor:dev" script to package.json')
    return true
  }
  catch {
    logger.error('Failed to write to package.json')
    return false
  }
}
