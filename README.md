<!--
Get your module up and running quickly.

Find and replace all on all files (CMD+SHIFT+F):
- Name: My Module
- Package name: my-module
- Description: My new Nuxt module
-->

# Nuxt Workers

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

Background job processing for Nuxt using BullMQ with a dedicated workers process.

- [✨ &nbsp;Release Notes](/CHANGELOG.md)
<!-- - [🏀 Online playground](https://stackblitz.com/github/your-org/my-module?file=playground%2Fapp.vue) -->
<!-- - [📖 &nbsp;Documentation](https://example.com) -->

## Features

- **Dedicated processing**: Workers run in a separate Node process – no coupling to your web server.
- **Scalability**: Run multiple worker processes and instances across machines; backed by Redis.
- **Simple DX**: Define queues/workers in `server/queues` and `server/workers` using first-class helpers.
- **Safe dev**: Workers do not auto-start with Nitro; start them explicitly.
- **Bull Board ready**: Expose Bull Board in your app without importing worker code.

## Install

Since this is not an official Nuxt module yet, install it as a dev dependency and manually add it to your Nuxt config.

```bash
npm i -D nuxt-workers
```

Add the module in `nuxt.config.ts` and set your Redis connection.

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-workers'],
  workers: {
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
import { defineQueue } from '#workers'

export default defineQueue({
  name: 'hello',
})
```

## Define a worker

Create `server/workers/index.ts`:

```ts
import { defineWorker } from '#workers'
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

- Start your Nuxt app normally (dev or build). This module generates a dedicated workers entry.
- Start workers explicitly in a separate terminal:

```bash
# after a build
nuxi build
node .output/server/workers/index.mjs
```

## Shutdown

The workers process handles graceful shutdown on `SIGINT/SIGTERM` and logs worker start/stop.


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
[npm-version-src]: https://img.shields.io/npm/v/my-module/latest.svg?style=flat&colorA=020420&colorB=00DC82
[npm-version-href]: https://npmjs.com/package/my-module

[npm-downloads-src]: https://img.shields.io/npm/dm/my-module.svg?style=flat&colorA=020420&colorB=00DC82
[npm-downloads-href]: https://npm.chart.dev/my-module

[license-src]: https://img.shields.io/npm/l/my-module.svg?style=flat&colorA=020420&colorB=00DC82
[license-href]: https://npmjs.com/package/my-module

[nuxt-src]: https://img.shields.io/badge/Nuxt-020420?logo=nuxt.js
[nuxt-href]: https://nuxt.com
