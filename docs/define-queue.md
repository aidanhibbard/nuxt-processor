---
title: Define Queue
---

# Define Queue

`defineQueue` registers a BullMQ queue bound to your Redis connection configured via the module.

## Usage

Create `server/queues/index.ts`:

The `options` are forwarded to BullMQ's `Queue` constructor, except `connection` which is managed by the module.

```ts
import { defineQueue } from '#processor'

export default defineQueue({
  name: 'hello',
  options: {}
})
```

## API

```ts
type DefineQueueArgs<DefaultNameType extends string = string> = {
  name: DefaultNameType
  options?: Omit<QueueOptions, 'connection'> & { defaultJobOptions?: JobsOptions }
}

declare function defineQueue<
  DataTypeOrJob = any,
  DefaultResultType = any,
  DefaultNameType extends string = string,
>(args: DefineQueueArgs<DefaultNameType>): Queue<DataTypeOrJob, DefaultResultType, DefaultNameType>
```

### Typed example

```ts
import { defineQueue } from '#processor'

type HelloName = 'hello'
type HelloData = { message: string, ts: number }
type HelloResult = { echoed: string, processedAt: number }

export default defineQueue<HelloData, HelloResult, HelloName>({
  name: 'hello',
})

// Later in your app code, add a job with fully-typed name and data
await queue.add('hello', { message: 'hi', ts: Date.now() })
```
