import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const REDIS_KEYS = [
  'url',
  'host',
  'port',
  'password',
  'db',
  'username',
  'lazyConnect',
  'connectTimeout',
] as const

const FORBIDDEN_NEEDLES = [
  'redis-runtime:6381',
  'redis://redis-runtime',
  'NUXT_REDIS_URL',
  'NUXT_REDIS_HOST',
] as const

export function assertBakedRedisEmpty(sourcePath: string): void {
  const source = readFileSync(sourcePath, 'utf8')

  for (const needle of FORBIDDEN_NEEDLES) {
    if (source.includes(needle)) {
      throw new Error(`Baked output must not contain ${needle} (build-time leak)`)
    }
  }

  const match = source.match(/"redis":\s*\{([^}]+)\}/)
  const block = match?.[1]
  if (!block) {
    throw new Error('Could not find redis block in nitro.mjs')
  }
  for (const key of REDIS_KEYS) {
    const re = new RegExp(`"${key}":\\s*""`)
    if (!re.test(block)) {
      throw new Error(`Expected baked redis.${key} to be "" in nitro.mjs`)
    }
  }
}

function main(): void {
  const path = process.argv[2]
  if (!path) {
    console.error('Usage: assert-baked-redis-empty.ts <nitro.mjs>')
    process.exit(1)
  }

  try {
    assertBakedRedisEmpty(path)
    console.log('Baked redis runtime config is empty (no build-time Redis env)')
  }
  catch (err) {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
