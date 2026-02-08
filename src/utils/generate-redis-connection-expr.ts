/**
 * Returns a JavaScript code snippet that calls `resolveRedisConnection`
 * at runtime with the static config as a fallback.
 *
 * The generated code imports the runtime helper and passes the build-time
 * snapshot so env vars can override individual fields.
 *
 * @param staticRedis - JSON-stringified Redis options from nuxt.config (build-time snapshot)
 */
export function generateRedisConnectionExpr(staticRedis: string): string {
  return `resolveRedisConnection(${staticRedis})`
}

/**
 * Returns the import statement needed alongside the expression.
 */
export function getRedisConnectionImport(alias: string): string {
  return `import { resolveRedisConnection } from '${alias}'`
}
