/**
 * Resolves Redis connection options at runtime.
 *
 * Environment variables take precedence over the static config snapshot
 * captured at build time. Returns an object with all options preserved,
 * including `url` when applicable, so `setConnection` can pass them
 * all to the IORedis constructor.
 */
export function resolveRedisConnection(
  staticConfig: Record<string, unknown>,
): Record<string, unknown> {
  const url = process.env.NUXT_REDIS_URL ?? staticConfig.url
  return {
    ...(url ? { url } : {}),
    host: process.env.NUXT_REDIS_HOST ?? staticConfig.host ?? '127.0.0.1',
    port: Number(process.env.NUXT_REDIS_PORT ?? staticConfig.port ?? 6379),
    password: process.env.NUXT_REDIS_PASSWORD ?? staticConfig.password ?? '',
    username: process.env.NUXT_REDIS_USERNAME ?? staticConfig.username ?? undefined,
    db: Number(process.env.NUXT_REDIS_DB ?? staticConfig.db ?? 0),
    lazyConnect: process.env.NUXT_REDIS_LAZY_CONNECT
      ? process.env.NUXT_REDIS_LAZY_CONNECT === 'true'
      : (staticConfig.lazyConnect as boolean | undefined),
    connectTimeout: process.env.NUXT_REDIS_CONNECT_TIMEOUT
      ? Number(process.env.NUXT_REDIS_CONNECT_TIMEOUT)
      : (staticConfig.connectTimeout as number | undefined),
  }
}
