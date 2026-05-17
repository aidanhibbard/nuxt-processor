## v2.0.0-beta.0

[compare changes](https://github.com/aidanhibbard/nuxt-processor/compare/v1.1.0...v2.0.0-beta.0)

> **Beta:** install with `npm install nuxt-processor@beta`. Breaking vs 1.x — see [upgrading guide](https://aidanhibbard.github.io/nuxt-processor/upgrading).

### ⚠️ Breaking Changes

- **Redis configuration** — remove `processor.redis` from module options; use `runtimeConfig.redis` and/or `REDIS_*` (dev/build) and `NUXT_REDIS_*` (runtime). See [upgrading guide](https://aidanhibbard.github.io/nuxt-processor/upgrading).
- **Workers registry** — rename `$workers()` to `useProcessor()`; remove `setConnection()`. Connection is resolved from `useRuntimeConfig().redis` when each queue or worker is created.
- **Nitro plugin** — remove the plugin that called `setConnection()` and overrode `process.env.REDIS_URL` at runtime.
- **Worker entry** — generated workers bundle no longer calls `setConnection()` at startup; Redis comes from runtime config like the main server. Shutdown uses `useProcessor().stopAll()`.

### 🚀 Enhancements

- Resolve Redis at queue/worker creation time (fixes `ECONNREFUSED 127.0.0.1:6379` when queues are imported before a Nitro plugin runs, e.g. Bull Board or Docker).
- Add `buildRedisRuntimeConfig()` with `defu` merge: user `runtimeConfig.redis` overrides `REDIS_*` env at module setup.
- Normalize runtime connection options (`port` / `db` / `connectTimeout` coercion; `lazyConnect` from `true`/`false` strings via `NUXT_REDIS_*`).
- Shared registry on `globalThis` so top-level `defineQueue()` works when Nitro bundles modules out of order.
- `stopAll()` closes all registered queues/workers and clears the registry (safe for dev reload and worker shutdown).
- Set `maxRetriesPerRequest: null` on worker connections only (BullMQ blocking client requirement).
- Ship markdown docs in the npm package under `docs/` for tooling and LLMs.

### 📖 Documentation

- Add `docs/redis.md`, `docs/api.md`, and `docs/upgrading.md`; expand README with env tables and Docker notes.
- Document `NUXT_REDIS_*` vs `REDIS_*` per [Nuxt runtime config](https://nuxt.com/docs/4.x/guide/going-further/runtime-config#environment-variables).

### 🧪 Tests

- Add `spec/utils/redis-runtime-config.spec.ts`, `spec/utils/normalize-redis-connection.spec.ts`, and `spec/scripts/assert-baked-redis-empty.spec.ts`.
- Expand `spec/runtime/utils/workers.spec.ts` for connection options, registry lifecycle, and worker `maxRetriesPerRequest`.
- Add `npm run test:docker` — build image without Redis env, assert baked `nitro.mjs`, run runtime scenarios (`NUXT_REDIS_URL`, host/port, password, options).

### 💅 Refactors

- Remove `.npmrc` pnpm-only keys from the published package root.

## v1.1.0

[compare changes](https://github.com/aidanhibbard/nuxt-processor/compare/v1.0.0...v1.1.0)

### 🩹 Fixes

- Drop direct `ioredis` dependency; use BullMQ’s bundled connection stack ([#53](https://github.com/aidanhibbard/nuxt-processor/pull/53)).
- Improve worker connection handling in `$workers()` (`maxRetriesPerRequest: null` for workers).

## v1.0.0

[compare changes](https://github.com/aidanhibbard/nuxt-processor/compare/v0.0.15...v1.0.0)

### 🚀 Enhancements

- First stable `1.x` release line.
- Merge `processor.redis` into `runtimeConfig.redis` at build time; env variable and CLI fixes ([#51](https://github.com/aidanhibbard/nuxt-processor/pull/51), [#52](https://github.com/aidanhibbard/nuxt-processor/pull/52)).

### 🩹 Fixes

- Upgrade `nuxt` from 4.1.2 to 4.2.2 ([#45](https://github.com/aidanhibbard/nuxt-processor/pull/45)).
- Upgrade `@bull-board/h3` from 6.13.0 to 6.16.2 ([#47](https://github.com/aidanhibbard/nuxt-processor/pull/47)).

## v0.0.15

[compare changes](https://github.com/aidanhibbard/nuxt-processor/compare/v0.0.14...v0.0.15)

## v0.0.14

[compare changes](https://github.com/aidanhibbard/nuxt-processor/compare/v0.0.13...v0.0.14)

### 🩹 Fixes

- Upgrade @rollup/rollup-linux-x64-gnu from 4.9.5 to 4.53.3 ([74cb730](https://github.com/aidanhibbard/nuxt-processor/commit/74cb730))
- Upgrade @bull-board/ui from 6.14.2 to 6.15.0 ([087d75a](https://github.com/aidanhibbard/nuxt-processor/commit/087d75a))
- Upgrade @nuxt/kit from 4.2.0 to 4.2.2 ([270dd5d](https://github.com/aidanhibbard/nuxt-processor/commit/270dd5d))
- Upgrade @bull-board/ui from 6.15.0 to 6.16.2 ([3e56d15](https://github.com/aidanhibbard/nuxt-processor/commit/3e56d15))

### ❤️ Contributors

- Snyk-bot <snyk-bot@snyk.io>

## v0.0.13

[compare changes](https://github.com/aidanhibbard/nuxt-processor/compare/v0.0.12...v0.0.13)

### 🩹 Fixes

- Upgrade bullmq from 5.58.7 to 5.58.9 ([9d95b8f](https://github.com/aidanhibbard/nuxt-processor/commit/9d95b8f))
- Upgrade @nuxt/kit from 4.1.2 to 4.1.3 ([d0785f8](https://github.com/aidanhibbard/nuxt-processor/commit/d0785f8))
- Upgrade ioredis from 5.8.0 to 5.8.1 ([330bc8e](https://github.com/aidanhibbard/nuxt-processor/commit/330bc8e))
- Upgrade @bull-board/ui from 6.13.0 to 6.13.1 ([fd25999](https://github.com/aidanhibbard/nuxt-processor/commit/fd25999))
- Upgrade ioredis from 5.8.1 to 5.8.2 ([356d4d8](https://github.com/aidanhibbard/nuxt-processor/commit/356d4d8))
- Upgrade @bull-board/ui from 6.13.1 to 6.14.0 ([d6cadb0](https://github.com/aidanhibbard/nuxt-processor/commit/d6cadb0))
- Upgrade @nuxt/kit from 4.1.3 to 4.2.0 ([64206e1](https://github.com/aidanhibbard/nuxt-processor/commit/64206e1))
- Upgrade bullmq from 5.58.9 to 5.63.0 ([39342b6](https://github.com/aidanhibbard/nuxt-processor/commit/39342b6))
- Upgrade @bull-board/ui from 6.14.0 to 6.14.2 ([44389bb](https://github.com/aidanhibbard/nuxt-processor/commit/44389bb))

### ❤️ Contributors

- Snyk-bot <snyk-bot@snyk.io>

## v0.0.12

[compare changes](https://github.com/aidanhibbard/nuxt-processor/compare/v0.0.11...v0.0.12)

## v0.0.11

[compare changes](https://github.com/aidanhibbard/nuxt-processor/compare/v0.0.10...v0.0.11)

## v0.0.10

[compare changes](https://github.com/aidanhibbard/nuxt-processor/compare/v0.0.9...v0.0.10)

## v0.0.9

[compare changes](https://github.com/aidanhibbard/nuxt-processor/compare/v0.0.8...v0.0.9)

### 🩹 Fixes

- Playground/package.json & playground/package-lock.json to reduce vulnerabilities ([6575378](https://github.com/aidanhibbard/nuxt-processor/commit/6575378))

### ❤️ Contributors

- Snyk-bot <snyk-bot@snyk.io>

## v0.0.8

[compare changes](https://github.com/aidanhibbard/nuxt-processor/compare/v0.0.7...v0.0.8)

## v0.0.7

[compare changes](https://github.com/aidanhibbard/nuxt-processor/compare/v0.0.6...v0.0.7)

## v0.0.6

[compare changes](https://github.com/aidanhibbard/nuxt-processor/compare/v0.0.5...v0.0.6)

## v0.0.5

[compare changes](https://github.com/aidanhibbard/nuxt-processor/compare/v0.0.4...v0.0.5)

## v0.0.4

[compare changes](https://github.com/aidanhibbard/nuxt-processor/compare/v0.0.3...v0.0.4)

## v0.0.3

[compare changes](https://github.com/aidanhibbard/nuxt-processor/compare/v0.0.2...v0.0.3)

## v0.0.2

[compare changes](https://github.com/aidanhibbard/nuxt-processor/compare/v0.0.1...v0.0.2)

## v0.0.1

