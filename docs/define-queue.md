---
title: Define Queue
---

# Define Queue

`defineQueue` registers a BullMQ queue bound to your Redis connection configured via the module.

## Usage

Create `server/queues/index.ts`:

```ts
import { defineQueue } from '#processor'

export default defineQueue({
  name: 'hello',
  options: {}
})
```

## API

```ts
type DefineQueueArgs = {
  name: string
  options?: Omit<QueueOptions, 'connection'> & { defaultJobOptions?: JobsOptions }
}
```

The `options` are forwarded to BullMQ's `Queue` constructor, except `connection` which is managed by the module.


