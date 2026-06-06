# Nuxt Processor

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Known Vulnerabilities](https://snyk.io/test/github/aidanhibbard/nuxt-processor/badge.svg)](https://snyk.io/test/github/aidanhibbard/nuxt-processor)

## Scalable processing for Nuxt

<img width="512" height="250" alt="image" src="https://github.com/user-attachments/assets/d238fb33-8373-46ec-b132-85170ab67c80" />

Note: This package is under very active development! Please consider creating issues if you run into anything!

**Upgrading from 0.x or 1.x?** Redis config and the workers registry changed in v2 — see the [upgrading guide](https://aidanhibbard.github.io/nuxt-processor/upgrading).

**Using an LLM?** Documentation markdown is included in the package at `node_modules/nuxt-processor/docs/`

- [✨ &nbsp;Release Notes](./changelog.md)
- [📖 &nbsp;Documentation](https://aidanhibbard.github.io/nuxt-processor/)

## Features

- **Dedicated processing**: Workers run in a separate Node process – no coupling to your web server.
- **Scalability**: Run multiple worker processes and instances across machines.
- **Simple DX**: Define queues/workers using first-class helpers.

## Used by

Also using Nuxt Processor? Open an issue to get your businesses logo added below!

<div>
  <a href="https://getminds.ai/" target="_blank" rel="noreferrer">
    <img src="https://getminds.ai/favicon.ico" alt="Minds AI" height="72" />
  </a>
</div>

## Sections

- [Install](#install)
- [Upgrading from 0.x / 1.x](https://aidanhibbard.github.io/nuxt-processor/upgrading)
- [Redis configuration](#redis-configuration)
- [Define a queue and enqueue from your app](#define-a-queue-and-enqueue-from-your-app)
- [Define a worker](#define-a-worker)
- [Running](#running)
- [CLI](#cli)
- [Durabull](#durabull)
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

## Redis configuration

Using Valkey? Read [this thread](https://github.com/taskforcesh/bullmq/issues/3083).

| Config key | Dev / build | Runtime (production / Docker) |
| --- | --- | --- |
| `redis.url` | `REDIS_URL` | `NUXT_REDIS_URL` |
| `redis.host` | `REDIS_HOST` | `NUXT_REDIS_HOST` |
| `redis.port` | `REDIS_PORT` | `NUXT_REDIS_PORT` |
| `redis.password` | `REDIS_PASSWORD` | `NUXT_REDIS_PASSWORD` |
| `redis.db` | `REDIS_DB` | `NUXT_REDIS_DB` |
| `redis.username` | `REDIS_USERNAME` | `NUXT_REDIS_USERNAME` |
| `redis.lazyConnect` | `REDIS_LAZY_CONNECT` | `NUXT_REDIS_LAZY_CONNECT` |
| `redis.connectTimeout` | `REDIS_CONNECT_TIMEOUT` | `NUXT_REDIS_CONNECT_TIMEOUT` |

Configure Redis via [runtime config](https://nuxt.com/docs/4.x/guide/going-further/runtime-config): **`REDIS_*` in dev/build**, **`NUXT_REDIS_*` at runtime** ([details](#redis-configuration) · [docs](https://aidanhibbard.github.io/nuxt-processor/redis)). API: [docs/API](https://aidanhibbard.github.io/nuxt-processor/api).

**Dev / build** — in the [.env file](https://nuxt.com/docs/4.x/directory-structure/env) (loaded by the Nuxt CLI during `nuxi dev` and `nuxi build`):

```ini
REDIS_URL=redis://127.0.0.1:6379/0
```

Optional (same as 0.x): `REDIS_USERNAME`, `REDIS_LAZY_CONNECT=true`, `REDIS_CONNECT_TIMEOUT=10000`. See [Redis configuration](https://aidanhibbard.github.io/nuxt-processor/redis#connection-options-0x-parity).

**Docker / production** — set [`NUXT_REDIS_*` on the running container](https://nuxt.com/docs/4.x/directory-structure/env#production) on **both** the app and workers services ([details](https://aidanhibbard.github.io/nuxt-processor/redis#nuxt_redis--runtime-only)):

```yaml
environment:
  NUXT_REDIS_URL: redis://redis:6379/0
```

Or when starting the built server directly:

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

## Durabull

[Durabull](https://durabull.io) is a modern BullMQ dashboard for watching queues, inspecting jobs, and debugging failures. Run it alongside your Nuxt app and point it at the same Redis connection used by Nuxt Processor:

```bash
docker run --rm -p 127.0.0.1:3000:3000 \
  -e DURABULL_AUTHLESS=true \
  -e DURABULL_ENV_CONNECTIONS=true \
  -e DURABULL_REDIS_URL_ENCRYPTION_KEY=$(openssl rand -hex 32) \
  -e DURABULL_REDIS_URL_MAIN=redis://host.docker.internal:6379/0 \
  -e DURABULL_REDIS_URL_MAIN_ENVIRONMENT=development \
  -e DURABULL_REDIS_URL_DEFAULT=MAIN \
  -e APP_BASE_URL=http://localhost:3000 \
  -e VITE_PUBLIC_APP_URL=http://localhost:3000 \
  ghcr.io/durabullhq/durabull:latest
```

Then open `http://localhost:3000` and select the `MAIN` connection. If Redis runs in another container, put Durabull on the same Docker network and use that Redis service name instead of `host.docker.internal`.

For more options, see the dedicated [Durabull guide](https://aidanhibbard.github.io/nuxt-processor/durabull) and the [Durabull self-hosting docs](https://durabull.io/documentation/self-hosting/installation).

## Contribution

See **[CONTRIBUTING.md](./CONTRIBUTING.md)** for setup, tests, and pull requests.
Please follow our **[Code of Conduct](./CODE_OF_CONDUCT.md)**.

Quick start:

```bash
npm install
npm run dev:prepare
npm run dev
npm run ci
```


<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/nuxt-processor/latest.svg?style=flat&colorA=020420&colorB=00DC82
[npm-version-href]: https://npmjs.com/package/nuxt-processor

[npm-downloads-src]: https://img.shields.io/npm/dm/nuxt-processor.svg?style=flat&colorA=020420&colorB=00DC82
[npm-downloads-href]: https://npm.chart.dev/nuxt-processor

[license-src]: https://img.shields.io/npm/l/nuxt-processor.svg?style=flat&colorA=020420&colorB=00DC82
[license-href]: https://npmjs.com/package/nuxt-processor

