---
title: Redis configuration
---

# Redis configuration

Queues and workers connect via `useRuntimeConfig().redis` in `resolveConnection()`. Use **`REDIS_*` during dev/build** and **`NUXT_REDIS_*` at runtime** (when running the built server).

Nuxt only applies env overrides at runtime for variables that match declared `runtimeConfig` keys and use the [`NUXT_` prefix](https://nuxt.com/docs/4.x/guide/going-further/runtime-config#environment-variables). After `nuxi build`, your project [.env file is not read in production](https://nuxt.com/docs/4.x/directory-structure/env#production) — you must set variables in the host environment (Docker `environment:`, Kubernetes secrets, etc.).

Using Valkey? Read [this thread](https://github.com/taskforcesh/bullmq/issues/3083).

## Environment variables

| Runtime config key | Build / dev (`nuxi dev`, `nuxi build`) | Runtime (production server) |
| --- | --- | --- |
| `redis.url` | `REDIS_URL` | `NUXT_REDIS_URL` |
| `redis.host` | `REDIS_HOST` | `NUXT_REDIS_HOST` |
| `redis.port` | `REDIS_PORT` | `NUXT_REDIS_PORT` |
| `redis.password` | `REDIS_PASSWORD` | `NUXT_REDIS_PASSWORD` |
| `redis.db` | `REDIS_DB` | `NUXT_REDIS_DB` |
| `redis.username` | `REDIS_USERNAME` | `NUXT_REDIS_USERNAME` |
| `redis.lazyConnect` | `REDIS_LAZY_CONNECT` (`true` / omitted) | `NUXT_REDIS_LAZY_CONNECT` |
| `redis.connectTimeout` | `REDIS_CONNECT_TIMEOUT` (ms) | `NUXT_REDIS_CONNECT_TIMEOUT` |

### `REDIS_*` — build and dev

Read when the module runs (during `nuxi dev`, `nuxi build`, or `nuxi prepare`). Nuxt CLI loads `.env` in those commands, so this is the usual choice for local development:

```ini
REDIS_URL=redis://127.0.0.1:6379/0
# Optional (same names as 0.x processor.redis)
REDIS_USERNAME=myuser
REDIS_LAZY_CONNECT=true
REDIS_CONNECT_TIMEOUT=10000
```

Values are merged into `runtimeConfig.redis` and baked into the Nitro output. They apply at runtime **unless** overridden by `NUXT_REDIS_*`.

### `NUXT_REDIS_*` — runtime only

Use for **production and Docker**: env vars you inject when the container (or process) starts, not when the image is built.

Nuxt documents this under [runtime config environment variables](https://nuxt.com/docs/4.x/guide/going-further/runtime-config#environment-variables) — only `NUXT_`-prefixed names override `runtimeConfig` at runtime. See also [.env in production](https://nuxt.com/docs/4.x/directory-structure/env#production): the `.env` file is **not** loaded after `nuxi build`, so `REDIS_URL` in a container env block will **not** apply unless it was baked in at build time or you use `NUXT_REDIS_URL`.

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

## Connection options (0.x parity)

These were supported on `processor.redis` in 0.x and map to the same [ioredis / BullMQ `RedisOptions`](https://github.com/redis/ioredis/blob/master/docs/interfaces/CommonRedisOptions.md) fields on `runtimeConfig.redis`:

| Option | Env (build) | Env (runtime) | Notes |
| --- | --- | --- | --- |
| `username` | `REDIS_USERNAME` | `NUXT_REDIS_USERNAME` | Redis ACL user (Redis 6+) |
| `lazyConnect` | `REDIS_LAZY_CONNECT=true` | `NUXT_REDIS_LAZY_CONNECT` | Opt in when you want to defer connecting until the first Redis command (e.g. avoid build-time connects) |
| `connectTimeout` | `REDIS_CONNECT_TIMEOUT` | `NUXT_REDIS_CONNECT_TIMEOUT` | Milliseconds |

You can also set any of these in `runtimeConfig.redis` in `nuxt.config` (wins over `REDIS_*` at build).

## Defaults

If no host/url/port options apply after the precedence above, [ioredis](https://github.com/redis/ioredis) uses `127.0.0.1:6379`. Empty strings in config are ignored so unset keys do not block fallbacks.

## Connection behavior (BullMQ)

The module applies [BullMQ production defaults](https://docs.bullmq.io/guide/going-to-production) when creating queues and workers:

| Role | Setting | Why |
| --- | --- | --- |
| **Queue** (producer) | `enableOfflineQueue: false` | `queue.add()` fails fast when Redis is down instead of hanging until reconnect ([failing fast](https://docs.bullmq.io/patterns/failing-fast-when-redis-is-down)) |
| **Worker** (consumer) | `maxRetriesPerRequest: null` | Required for BullMQ blocking worker connections |

Queue and worker `error` events are logged with the `nuxt-processor` tag. On Nitro server shutdown, the module closes all registered queues and workers via `stopAll()`.

## Module options

See [API — Module options](/api#module-options).

## Typing

The module augments `@nuxt/schema` with `RuntimeConfig.redis` (`RedisOptions` plus optional `url`). Extend `nuxt/schema` in your app for stricter typing if needed.
