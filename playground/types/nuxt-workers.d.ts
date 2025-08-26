declare module 'nuxt-workers' {
  import type { JobsOptions, Job } from 'bullmq'
  export interface QueueDefinition { name: string; defaultJobOptions?: JobsOptions }
  export interface WorkerDefinition<T = unknown, R = unknown> {
    name: string
    concurrency?: number
    cron?: Record<string, string>
    process: (job: Job<T, R>) => Promise<R> | R
  }
  export function defineQueue<T extends QueueDefinition>(d: T): T
  export function defineWorker<T = unknown, R = unknown>(d: WorkerDefinition<T, R>): WorkerDefinition<T, R>
}

declare module '#workers' {
  import type { JobsOptions, Job } from 'bullmq'
  export interface QueueDefinition { name: string; defaultJobOptions?: JobsOptions }
  export interface WorkerDefinition<T = unknown, R = unknown> {
    name: string
    concurrency?: number
    cron?: Record<string, string>
    process: (job: Job<T, R>) => Promise<R> | R
  }
  export function defineQueue<T extends QueueDefinition>(d: T): T
  export function defineWorker<T = unknown, R = unknown>(d: WorkerDefinition<T, R>): WorkerDefinition<T, R>
}


