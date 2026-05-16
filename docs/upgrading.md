---
title: Upgrading
---

# Upgrading

This guide covers **v1.x** changes to Redis configuration and the workers registry. Treat this as a **major / breaking** upgrade if you are on **0.x** with `processor.redis`, `$workers()`, or `setConnection()`.

## Why this changed

### 1. Connection timing (Docker and eager imports)

Previously, Redis was applied in a Nitro plugin via `$workers().setConnection()`. Queues and workers created **before** that plugin ran (top-level imports, handlers loaded early) saw an **empty** connection and fell back to ioredis defaults (`127.0.0.1:6379`). That showed up in production as `ECONNREFUSED 127.0.0.1:6379` even when `REDIS_URL` or `processor.redis` looked correct — especially in Docker and with routes like Bull Board that import queues at load time.

The fix is to resolve Redis from **`useRuntimeConfig().redis` when each queue/worker is created**, not from a one-time plugin callback.

### 2. Nuxt-native configuration

Redis settings now follow [Nuxt runtime config](https://nuxt.com/docs/4.x/guide/going-further/runtime-config):

- **`REDIS_*`** — read when the module runs during **`nuxi dev` / `nuxi build`** (`.env` loaded by the Nuxt CLI).
- **`NUXT_REDIS_*`** — overrides at **runtime** when you run the built server ([documented Nuxt behaviour](https://nuxt.com/docs/4.x/guide/going-further/runtime-config#environment-variables)).

After `nuxi build`, [.env is not loaded](https://nuxt.com/docs/4.x/directory-structure/env#production). Docker and other deploys should set **`NUXT_REDIS_*` on the container**, not rely on a `.env` file or bare `REDIS_URL` at container start unless those values were baked in at build time.

This matches how Nuxt apps are deployed everywhere else and removes special-casing `process.env.REDIS_URL` inside the module.

### 3. Simpler public API

`$workers()` and `setConnection()` are replaced by **`useProcessor()`**, which reads runtime config directly. Most apps only need `defineQueue` / `defineWorker` from `#processor`.

---

## Breaking changes

| Removed / changed | Replacement |
| --- | --- |
| `processor.redis` in `nuxt.config` | `runtimeConfig.redis` and/or `REDIS_*` / `NUXT_REDIS_*` env vars |
| `$workers()` | `useProcessor()` from `#processor-utils` |
| `setConnection()` | Not needed — connection comes from `useRuntimeConfig().redis` |
| Nitro plugin that called `setConnection` | Removed |
| Runtime override via bare `REDIS_URL` only | `NUXT_REDIS_URL` at runtime, or `REDIS_URL` at **build** time |
| `processor.redis` options: `username`, `lazyConnect`, `connectTimeout` in module defaults | Set via `runtimeConfig.redis` or BullMQ `options` if required |

`defineQueue` and `defineWorker` imports from `#processor` are unchanged.

---

## Migration

### Redis in `nuxt.config`

**Before:**

```ts
export default defineNuxtConfig({
  modules: ['nuxt-processor'],
  processor: {
    redis: {
      url: process.env.REDIS_URL,
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: Number(process.env.REDIS_PORT ?? 6379),
    },
  },
})
```

**After (pick what fits your deploy):**

```ts
export default defineNuxtConfig({
  modules: ['nuxt-processor'],
  runtimeConfig: {
    redis: {
      // optional dev default in config
      url: 'redis://127.0.0.1:6379/0',
    },
  },
})
```

```ini
# .env — dev / build (nuxi dev, nuxi build)
REDIS_URL=redis://127.0.0.1:6379/0
```

```yaml
# Docker Compose — runtime (app + workers services)
environment:
  NUXT_REDIS_URL: redis://redis:6379/0
```

Full env reference: [Redis configuration](/redis).

### Docker / production

If you only set `REDIS_URL` when the container **starts** (after `nuxi build`), switch to **`NUXT_REDIS_URL`** on **both** the Nuxt app and workers processes, or pass `REDIS_URL` during **`docker build` / `nuxi build`** so it is baked into the output.

```yaml
services:
  app:
    environment:
      NUXT_REDIS_URL: redis://redis:6381/0
  workers:
    command: ["node", ".output/server/workers/index.mjs"]
    environment:
      NUXT_REDIS_URL: redis://redis:6381/0
```

Host/port without a URL:

```yaml
environment:
  NUXT_REDIS_HOST: redis
  NUXT_REDIS_PORT: "6381"
  NUXT_REDIS_DB: "0"
```

### `$workers()` / `setConnection()`

**Before:**

```ts
import { $workers } from '#processor-utils'

$workers().setConnection({ host: 'localhost', port: 6379 })
```

**After:**

```ts
import { useProcessor } from '#processor-utils'

const { createQueue, createWorker } = useProcessor()
// connection resolved from useRuntimeConfig().redis automatically
```

If you only use `defineQueue` / `defineWorker`, **no code changes** are required beyond config/env.

### Workers folder

Still configured with `processor.workers` (default `server/workers`). Unchanged.

---

## Checklist

- [ ] Remove `processor.redis` from `nuxt.config`
- [ ] Add `runtimeConfig.redis` and/or `.env` with `REDIS_*` for local dev/build
- [ ] Set `NUXT_REDIS_*` on production/Docker app **and** workers
- [ ] Replace `$workers` / `setConnection` with `useProcessor()` if used
- [ ] Rebuild and smoke-test: enqueue a job, confirm workers process it
- [ ] Confirm logs do not show `ECONNREFUSED 127.0.0.1:6379` when Redis is remote

---

## Further reading

- [Redis configuration](/redis)
- [API reference](/api)
- [Getting started](/getting-started)
