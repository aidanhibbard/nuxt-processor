---
title: Define Queue
---

# Define Queue

`defineQueue` registers a BullMQ queue using the Redis connection from `useRuntimeConfig().redis` (see [Redis configuration](/redis)).

Create `server/queues/index.ts`:

```ts
import { defineQueue } from '#processor'

export default defineQueue({
  name: 'hello',
  options: {},
})
```

`options` are forwarded to BullMQ's `Queue` constructor except `connection`, which the module sets from runtime config.

For typed usage and full signatures, see the [API reference](/api#definequeue).
