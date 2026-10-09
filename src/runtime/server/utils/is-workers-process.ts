export function isWorkersProcess(): boolean {
  return typeof process !== 'undefined' && process.env?.NUXT_PROCESSOR_WORKER === '1'
}
