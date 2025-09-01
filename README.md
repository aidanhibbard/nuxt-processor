# Nuxt Processor

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Known Vulnerabilities](https://snyk.io/test/github/aidanhibbard/nuxt-processor/badge.svg)](https://snyk.io/test/github/aidanhibbard/nuxt-processor)

Background job processing for Nuxt using BullMQ with a dedicated workers process.

<img width="763" height="321" alt="image" src="https://github.com/user-attachments/assets/f49d79a9-f99a-4612-b3bc-cad724475bf4" />

Note: This package is under very active development! Please consider creating issues if you run into anything!

- [✨ &nbsp;Release Notes](/CHANGELOG.md)
- [📖 &nbsp;Documentation](https://aidanhibbard.github.io/nuxt-processor/)

## Features

- **Dedicated processing**: Workers run in a separate Node process – no coupling to your web server.
- **Scalability**: Run multiple worker processes and instances across machines.
- **Simple DX**: Define queues/workers in `server/queues` and `server/workers` using first-class helpers.

## Sections

- [Install](#install)
- [Define a queue and enqueue from your app](#define-a-queue-and-enqueue-from-your-app)
- [Define a worker](#define-a-worker)
- [Running](#running)
- [CLI](#cli)
- [Bull Board](#bull-board)
- [Contribution](#contribution)

## Install

```bash
npm i -D nuxt-processor
```

Add the module in `nuxt.config.ts` and set your Redis connection.

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-processor'],
  processor: {
    redis: {
      host: process.env.NUXT_REDIS_HOST ?? '127.0.0.1', // defaults '127.0.0.1'
      port: Number(process.env.NUXT_REDIS_PORT ?? 6379), // defaults 6379
      password: process.env.NUXT_REDIS_PASSWORD ?? '', // defaults ''
    },
  },
})
```

## Define a queue and enqueue from your app

Create `server/queues/index.ts`:

```ts
import { defineQueue } from '#processor'

export default defineQueue({
  name: 'hello',
})
```

## Define a worker

Create `server/workers/index.ts`:

```ts
import { defineWorker } from '#processor'
import type { Job } from '#bullmq'

export default defineWorker({
  name: 'hello',
  async processor(job: Job) {
    // do work
    console.log('processed', job.name, job.data)
    return job.data
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

### CLI

A simple CLI is provided to run workers in development.

```bash
# from your project root
npx nuxt-processor dev
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

