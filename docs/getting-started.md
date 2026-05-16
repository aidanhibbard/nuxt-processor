---
title: Getting Started
---

# Getting Started

::: info Upgrading from 0.x
If you used `processor.redis`, `$workers()`, or `setConnection()`, read [Upgrading from 0.x](/upgrading) first.
:::

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

## Redis

Configure Redis with [runtime config](https://nuxt.com/docs/4.x/guide/going-further/runtime-config).

- **Dev / build:** `REDIS_*` in `.env` (loaded by `nuxi dev` / `nuxi build`) — see [Redis configuration](/redis).
- **Production / Docker:** `NUXT_REDIS_*` at runtime — Nuxt only applies env overrides with the [`NUXT_` prefix](https://nuxt.com/docs/4.x/guide/going-further/runtime-config#environment-variables). After build, [`.env` is not read](https://nuxt.com/docs/4.x/directory-structure/env#production); set vars on the container (Compose `environment:`, K8s, etc.).

```ini
# .env (nuxi dev / nuxi build)
REDIS_URL=redis://127.0.0.1:6379/0
```

```yaml
# Docker — same NUXT_REDIS_* on app and workers services
environment:
  NUXT_REDIS_URL: redis://redis:6379/0
```

Full reference: [Redis configuration](/redis) · [API](/api).

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

By default all workers run. To run only specific workers, use the `--workers=` flag with a comma-separated list of worker names:

```bash
node .nuxt/dev/workers/index.mjs --workers=basic,hello
```

### CLI

Use the CLI to run workers with file watching and restarts:

```bash
# runs all workers
npx nuxt-processor dev

# run only specific workers
npx nuxt-processor dev --workers=basic,hello
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

- After building for production, run workers with the same Redis env as your app. On **Docker deploys**, use `NUXT_REDIS_*` on both containers ([Nuxt production env](https://nuxt.com/docs/4.x/directory-structure/env#production)); locally you can rely on `REDIS_*` baked in at build if you set them during `nuxi build`:

```bash
nuxi build
NUXT_REDIS_URL=redis://127.0.0.1:6379/0 node .output/server/workers/index.mjs
```

To run only specific workers in production:

```bash
node .output/server/workers/index.mjs --workers=basic,hello
```

## Bull Board

See the dedicated page: [Bull Board](/bull-board)
