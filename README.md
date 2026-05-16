# Nuxt Processor

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Known Vulnerabilities](https://snyk.io/test/github/aidanhibbard/nuxt-processor/badge.svg)](https://snyk.io/test/github/aidanhibbard/nuxt-processor)

## Scalable processing for Nuxt

<img width="512" height="250" alt="image" src="https://github.com/user-attachments/assets/d238fb33-8373-46ec-b132-85170ab67c80" />

Note: This package is under very active development! Please consider creating issues if you run into anything!

- [✨ &nbsp;Release Notes](/CHANGELOG.md)
- [📖 &nbsp;Documentation](https://aidanhibbard.github.io/nuxt-processor/)

## Features

- **Dedicated processing**: Workers run in a separate Node process – no coupling to your web server.
- **Scalability**: Run multiple worker processes and instances across machines.
- **Simple DX**: Define queues/workers using first-class helpers.

## Used by

<div>
  <a href="https://getminds.ai/" target="_blank" rel="noreferrer">
    <img src="https://getminds.ai/favicon.ico" alt="Minds AI" height="72" />
  </a>
</div>

## Sections

- [Install](#install)
- [Redis configuration](#redis-configuration)
- [Define a queue and enqueue from your app](#define-a-queue-and-enqueue-from-your-app)
- [Define a worker](#define-a-worker)
- [Running](#running)
- [CLI](#cli)
- [Bull Board](#bull-board)
- [Contribution](#contribution)

## Install

```bash
npx nuxi@latest module add nuxt-processor@latest
```

Add the module in `nuxt.config.ts`:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-processor'],
})
```

Configure Redis via [runtime config](https://nuxt.com/docs/4.x/guide/going-further/runtime-config): **`REDIS_*` in dev/build**, **`NUXT_REDIS_*` at runtime** ([details](#redis-configuration) · [docs](https://aidanhibbard.github.io/nuxt-processor/redis)). API: [docs/API](https://aidanhibbard.github.io/nuxt-processor/api).

## Redis configuration

Queues and workers use `useRuntimeConfig().redis`.

| Config key | Dev / build | Runtime (production / Docker) |
| --- | --- | --- |
| `redis.url` | `REDIS_URL` | `NUXT_REDIS_URL` |
| `redis.host` | `REDIS_HOST` | `NUXT_REDIS_HOST` |
| `redis.port` | `REDIS_PORT` | `NUXT_REDIS_PORT` |
| `redis.password` | `REDIS_PASSWORD` | `NUXT_REDIS_PASSWORD` |
| `redis.db` | `REDIS_DB` | `NUXT_REDIS_DB` |

**Why two names?** Nuxt only overrides `runtimeConfig` at runtime with the [`NUXT_` prefix](https://nuxt.com/docs/4.x/guide/going-further/runtime-config#environment-variables). After `nuxi build`, [`.env` is not loaded`](https://nuxt.com/docs/4.x/directory-structure/env#production) — in Docker you must set `NUXT_REDIS_*` on the running container (or bake `REDIS_*` in at build time).

```ini
# .env — loaded by Nuxt CLI during nuxi dev / nuxi build
REDIS_URL=redis://127.0.0.1:6379/0
```

```yaml
# Docker Compose — runtime env on app and workers (see Nuxt production env docs)
environment:
  NUXT_REDIS_URL: redis://redis:6379/0
```

```bash
NUXT_REDIS_URL=redis://127.0.0.1:6379/0 node .output/server/workers/index.mjs
```

Use the same Redis settings on the Nuxt app and workers process. If nothing is set, ioredis defaults to `127.0.0.1:6379`.

Module option: `processor.workers` (default `server/workers`) — folder scanned for worker files.

## Define a queue and enqueue from your app

Create `server/queues/hello.ts`:

```ts
import { defineQueue } from '#processor'

type HelloName = 'hello'
type HelloData = { message: string, ts: number }
type HelloResult = { echoed: string, processedAt: number }

export default defineQueue<HelloData, HelloResult, HelloName>({
  name: 'hello',
  options: {},
})
```

## Define a worker

Create `server/workers/hello.ts`:

```ts
import { defineWorker } from '#processor'

type HelloName = 'hello'
type HelloData = { message: string, ts: number }
type HelloResult = { echoed: string, processedAt: number }

export default defineWorker<HelloName, HelloData, HelloResult>({
  name: 'hello',
  async processor(job) {
    return { echoed: job.data.message, processedAt: job.data.ts }
  },
  options: {},
})
```

## Running

- Start your Nuxt app normally. This module generates a dedicated workers entry.
- In development, run workers from `.nuxt/dev/workers/index.mjs` in a separate terminal:

```bash
nuxi dev
node .nuxt/dev/workers/index.mjs
```

By default all workers run. To run only specific workers, use the `--workers=` flag with a comma-separated list of worker names:

```bash
node .nuxt/dev/workers/index.mjs --workers=basic,hello
```

### CLI

A simple CLI is provided to run workers in development (with file watching and restarts).

```bash
# from your project root – runs all workers
npx nuxt-processor dev

# run only specific workers
npx nuxt-processor dev --workers=basic,hello
```

Notes:
- If `.nuxt/dev/workers/index.mjs` does not exist yet, the CLI will ask you to start your Nuxt dev server first to generate the entry point for your workers.
- If your `package.json` does not have a `processor:dev` script, the CLI will offer to add:

```json
{
  "scripts": {
    "processor:dev": "nuxt-processor dev"
  }
}
```

Then you can run:

```bash
npm run processor:dev
```

- After building for production, run workers from `.output/server/workers/index.mjs`:

```bash
nuxi build
node .output/server/workers/index.mjs
```

To run only specific workers in production:

```bash
node .output/server/workers/index.mjs --workers=basic,hello
```

## Bull Board

[Bull Board](https://github.com/felixmosh/bull-board) is an excellent UI for watching your queues, you can follow the setup in the playground to use it.

- [Server handler](./playground/server/handlers/bull-board.ts)
- [Route: `playground/server/routes/bull-board.ts`](./playground/server/routes/bull-board.ts)
- [Route: `playground/server/routes/bull-board/[...].ts`](./playground/server/routes/bull-board/%5B...%5D.ts)

Special thanks to [@genu](https://github.com/genu) for creating the H3 adapter.

For more help getting set up, see this Bull Board H3 adapter comment: <https://github.com/felixmosh/bull-board/pull/669#issuecomment-1883997968>.

## Contribution

<details>
  <summary>Local development</summary>
  
  ```bash
  # Install dependencies
  npm install
  
  # Generate type stubs
  npm run dev:prepare
  
  # Develop with the playground
  npm run dev
  
  # Build the playground
  npm run dev:build
  
  # Run ESLint
  npm run lint
  
  # Run Vitest
  npm run test
  npm run test:watch
  
  # Release new version
  npm run release
  ```

</details>


<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/nuxt-processor/latest.svg?style=flat&colorA=020420&colorB=00DC82
[npm-version-href]: https://npmjs.com/package/nuxt-processor

[npm-downloads-src]: https://img.shields.io/npm/dm/nuxt-processor.svg?style=flat&colorA=020420&colorB=00DC82
[npm-downloads-href]: https://npm.chart.dev/nuxt-processor

[license-src]: https://img.shields.io/npm/l/nuxt-processor.svg?style=flat&colorA=020420&colorB=00DC82
[license-href]: https://npmjs.com/package/nuxt-processor

