---
title: Redis configuration
---

# Redis configuration

Queues and workers connect via `useRuntimeConfig().redis` in `resolveConnection()`. Use **`REDIS_*` during dev/build** and **`NUXT_REDIS_*` at runtime** (when running the built server).

Nuxt only applies env overrides at runtime for variables that match declared `runtimeConfig` keys and use the [`NUXT_` prefix](https://nuxt.com/docs/4.x/guide/going-further/runtime-config#environment-variables). After `nuxi build`, your project [`.env` file is not read`](https://nuxt.com/docs/4.x/directory-structure/env#production) — you must set variables in the host environment (Docker `environment:`, Kubernetes secrets, etc.).

## Environment variables

| Runtime config key | Build / dev (`nuxi dev`, `nuxi build`) | Runtime (production server) |
| --- | --- | --- |
| `redis.url` | `REDIS_URL` | `NUXT_REDIS_URL` |
| `redis.host` | `REDIS_HOST` | `NUXT_REDIS_HOST` |
| `redis.port` | `REDIS_PORT` | `NUXT_REDIS_PORT` |
| `redis.password` | `REDIS_PASSWORD` | `NUXT_REDIS_PASSWORD` |
| `redis.db` | `REDIS_DB` | `NUXT_REDIS_DB` |

### `REDIS_*` — build and dev

Read when the module runs (during `nuxi dev`, `nuxi build`, or `nuxi prepare`). Nuxt CLI loads `.env` in those commands, so this is the usual choice for local development:

```ini
REDIS_URL=redis://127.0.0.1:6379/0
```

Values are merged into `runtimeConfig.redis` and baked into the Nitro output. They apply at runtime **unless** overridden by `NUXT_REDIS_*`.

### `NUXT_REDIS_*` — runtime only

Use for **production and Docker**: env vars you inject when the container (or process) starts, not when the image is built.

Nuxt documents this under [runtime config environment variables](https://nuxt.com/docs/4.x/guide/going-further/runtime-config#environment-variables) — only `NUXT_`-prefixed names override `runtimeConfig` at runtime. See also [`.env` in production](https://nuxt.com/docs/4.x/directory-structure/env#production): the `.env` file is **not** loaded after `nuxi build`, so `REDIS_URL` in a container env block will **not** apply unless it was baked in at build time or you use `NUXT_REDIS_URL`.

```bash
NUXT_REDIS_URL=redis://redis:6379/0 node .output/server/index.mjs
NUXT_REDIS_URL=redis://redis:6379/0 node .output/server/workers/index.mjs
```

**Docker Compose** — set `NUXT_REDIS_*` on **both** the app service and the workers service (same values):

```yaml
services:
  app:
    environment:
      NUXT_REDIS_URL: redis://redis:6379/0
  workers:
    environment:
      NUXT_REDIS_URL: redis://redis:6379/0
```

Alternatively, pass `REDIS_URL` at **image build** time (`docker build` / CI) so it is embedded during `nuxi build`; runtime still prefers `NUXT_REDIS_*` if set.

## Precedence

For each key, the first non-empty value wins (empty strings are ignored):

1. **`runtimeConfig.redis` in `nuxt.config`** (merged last at module setup — overrides `REDIS_*` from the build environment)
2. **`NUXT_REDIS_*`** when the server process starts
3. **Values baked in from `REDIS_*` at build** (if not overridden above)
4. **ioredis defaults** (`127.0.0.1:6379`)

## Examples

**Local `.env` (dev / build):**

```ini
REDIS_URL=redis://127.0.0.1:6379/0
```

**Docker deploy (runtime)** — per [Nuxt production env guidance](https://nuxt.com/docs/4.x/directory-structure/env#production), configure the orchestrator (Compose, Kubernetes, etc.), not a `.env` file in the image:

```yaml
environment:
  NUXT_REDIS_URL: redis://redis:6379/0
```

Set the same `NUXT_REDIS_*` values on the Nuxt app container and the workers container. Example: [playground `compose.runtime.yml`](https://github.com/aidanhibbard/nuxt-processor/blob/main/playground/compose.runtime.yml).

**Optional `nuxt.config`:**

```ts
export default defineNuxtConfig({
  modules: ['nuxt-processor'],
  runtimeConfig: {
    redis: {
      url: 'redis://127.0.0.1:6379/0',
    },
  },
})
```

## Defaults

The module sets `lazyConnect: true` on queue/worker connections so Redis is not contacted during the Nuxt build. If no options apply after the precedence above, [ioredis](https://github.com/redis/ioredis) uses its defaults.

## Module options

See [API — Module options](/api#module-options).

## Typing

The module augments `@nuxt/schema` with `RuntimeConfig.redis` (`RedisOptions` plus optional `url`). Extend `nuxt/schema` in your app for stricter typing if needed.
