/**
 * Resolves Redis connection options at runtime.
 *
 * Environment variables take precedence over the static config snapshot
 * captured at build time. The static config is shallow-merged first so
 * any extra IORedis keys (tls, sentinels, enableReadyCheck, etc.) are
 * preserved even though we don't have dedicated env-var overrides for them.
 *
 * Numeric env values are validated: if parsing yields NaN the static value
 * (or a safe default) is used instead.
 */

/** Parse a numeric env value, returning `fallback` when the result is NaN. */
function safeNumber(envValue: string | undefined, fallback: number): number {
  if (envValue === undefined || envValue === '') return fallback
  const n = Number(envValue)
  return Number.isNaN(n) ? fallback : n
}

/**
 * Parse a boolean-ish env string.
 * Returns `true` for `'true'`, `false` for `'false'`, and `undefined`
 * for anything else (so the static config value is kept).
 */
function safeBool(envValue: string | undefined): boolean | undefined {
  if (envValue === 'true') return true
  if (envValue === 'false') return false
  return undefined
}

export function resolveRedisConnection(
  staticConfig: Record<string, unknown>,
): Record<string, unknown> {
  // 1. Shallow-merge staticConfig so extra keys survive.
  const merged: Record<string, unknown> = { ...staticConfig }

  // 2. Apply env overrides for known keys only.
  const url = process.env.NUXT_REDIS_URL ?? merged.url
  if (url) {
    merged.url = url
  }
  else {
    // Only delete if it was never set — avoids leaving a stale key.
    delete merged.url
  }

  merged.host = process.env.NUXT_REDIS_HOST ?? merged.host ?? '127.0.0.1'
  merged.port = safeNumber(process.env.NUXT_REDIS_PORT, Number(merged.port ?? 6379))
  merged.password = process.env.NUXT_REDIS_PASSWORD ?? merged.password ?? ''
  merged.username = process.env.NUXT_REDIS_USERNAME ?? merged.username ?? undefined
  merged.db = safeNumber(process.env.NUXT_REDIS_DB, Number(merged.db ?? 0))

  const envLazy = safeBool(process.env.NUXT_REDIS_LAZY_CONNECT)
  if (envLazy !== undefined) {
    merged.lazyConnect = envLazy
  }
  else if (!('lazyConnect' in merged)) {
    merged.lazyConnect = undefined
  }

  if (process.env.NUXT_REDIS_CONNECT_TIMEOUT) {
    merged.connectTimeout = safeNumber(
      process.env.NUXT_REDIS_CONNECT_TIMEOUT,
      (merged.connectTimeout as number | undefined) ?? undefined as unknown as number,
    )
  }
  else if (!('connectTimeout' in merged)) {
    merged.connectTimeout = undefined
  }

  return merged
}
