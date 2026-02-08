export function generateRedisConnectionExpr(staticRedis: string): string {
  return `(() => {
  const s = ${staticRedis};
  const url = process.env.NUXT_REDIS_URL ?? s.url;
  if (url) return url;
  return {
    host: process.env.NUXT_REDIS_HOST ?? s.host ?? '127.0.0.1',
    port: Number(process.env.NUXT_REDIS_PORT ?? s.port ?? 6379),
    password: process.env.NUXT_REDIS_PASSWORD ?? s.password ?? '',
    username: process.env.NUXT_REDIS_USERNAME ?? s.username ?? undefined,
    db: Number(process.env.NUXT_REDIS_DB ?? s.db ?? 0),
    lazyConnect: process.env.NUXT_REDIS_LAZY_CONNECT ? process.env.NUXT_REDIS_LAZY_CONNECT === 'true' : s.lazyConnect,
    connectTimeout: process.env.NUXT_REDIS_CONNECT_TIMEOUT ? Number(process.env.NUXT_REDIS_CONNECT_TIMEOUT) : s.connectTimeout,
  };
})()`
}
