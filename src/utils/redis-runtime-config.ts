import { defu } from 'defu'

function lazyConnectFromEnv(value: string | undefined): boolean | '' {
  if (value === 'true') {
    return true
  }
  if (value === 'false') {
    return false
  }
  return ''
}

export function buildRedisRuntimeConfig(
  config: Record<string, unknown> | undefined,
  env: NodeJS.ProcessEnv = process.env,
) {
  return defu(config, {
    url: env.REDIS_URL ?? '',
    host: env.REDIS_HOST ?? '',
    port: env.REDIS_PORT ?? '',
    password: env.REDIS_PASSWORD ?? '',
    db: env.REDIS_DB ?? '',
    username: env.REDIS_USERNAME ?? '',
    lazyConnect: lazyConnectFromEnv(env.REDIS_LAZY_CONNECT),
    connectTimeout: env.REDIS_CONNECT_TIMEOUT
      ? Number(env.REDIS_CONNECT_TIMEOUT)
      : '',
  })
}
