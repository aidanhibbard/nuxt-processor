---
title: Getting Started
---

# Getting Started

## Install

```bash
npx nuxi@latest module add nuxt-processor
```

Add the module in `nuxt.config.ts` and set your Redis connection.

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-processor'],
  processor: {
    redis: {
      // Prefer a single URL if available (takes precedence over other fields)
      // e.g. redis://user:pass@host:6379/0
      url: process.env.NUXT_REDIS_URL,
      host: process.env.NUXT_REDIS_HOST ?? '127.0.0.1',
      port: Number(process.env.NUXT_REDIS_PORT ?? 6379),
      password: process.env.NUXT_REDIS_PASSWORD ?? '',
      username: process.env.NUXT_REDIS_USERNAME,
      db: Number(process.env.NUXT_REDIS_DB ?? 0),
      // Optional connection behavior
      // Delay connecting until first Redis command (useful to avoid build-time connects)
      lazyConnect: process.env.NUXT_REDIS_LAZY_CONNECT
        ? process.env.NUXT_REDIS_LAZY_CONNECT === 'true'
        : undefined,
      // Milliseconds to wait before giving up when establishing the connection
      connectTimeout: process.env.NUXT_REDIS_CONNECT_TIMEOUT
        ? Number(process.env.NUXT_REDIS_CONNECT_TIMEOUT)
        : undefined,
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

Use the CLI to run workers with file watching and restarts:

```bash
npx nuxt-processor dev
```

Notes:
- If `.nuxt/dev/workers/index.mjs` does not exist yet, the CLI will ask you to start your Nuxt dev server first and exit.
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

See the dedicated page: [Bull Board](/bull-board)


