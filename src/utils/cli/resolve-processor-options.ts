import { defu } from 'defu'
import type { ModuleOptions } from '../../module'

export const DEFAULT_PROCESSOR_OPTIONS: Required<Pick<ModuleOptions, 'workers' | 'workersPattern'>> & ModuleOptions = {
  workers: 'server/workers',
  workersPattern: '**/*.{ts,js,mjs}',
}

export function resolveProcessorOptions(
  config: Record<string, unknown> | undefined,
): ModuleOptions {
  const processor = (config?.processor ?? {}) as ModuleOptions
  return defu(processor, DEFAULT_PROCESSOR_OPTIONS) as ModuleOptions
}
