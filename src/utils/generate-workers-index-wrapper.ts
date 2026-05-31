export const DEFAULT_SHUTDOWN_TIMEOUT_MS = 25000

export function generateWorkersIndexWrapper(
  entryImportPath: string,
  options?: { shutdownTimeoutMs?: number },
): string {
  const shutdownTimeoutMs = options?.shutdownTimeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS
  return `import { createWorkersApp } from '${entryImportPath}'\n`
    + `import { consola } from 'consola'\n`
    + `const logger = consola.create({}).withTag('nuxt-processor')\n`
    + `const SHUTDOWN_TIMEOUT_MS = ${shutdownTimeoutMs}\n`
    + `const appPromise = createWorkersApp().catch((err) => { logger.error('failed to start workers', err); process.exit(1) })\n`
    + `let shuttingDown = false\n`
    + `const shutdown = async (signal) => { if (shuttingDown) return; shuttingDown = true; let exitCode = 0; try { logger.info('closing workers' + (signal ? ' ('+signal+')' : '') + '...') } catch (e) { console.warn('nuxt-processor: failed to log shutdown start', e) } ; try { const app = await appPromise; try { const names = (app?.workers || []).map(w => w && w.name).filter(Boolean); logger.info('closing workers:\\n' + names.map(n => ' - ' + n).join('\\n')) } catch (eL) { console.warn('nuxt-processor: failed to log workers list on shutdown', eL) } try { await Promise.race([ app.stop(), new Promise((_, reject) => setTimeout(() => reject(Object.assign(new Error('shutdown timeout'), { code: 'SHUTDOWN_TIMEOUT' })), SHUTDOWN_TIMEOUT_MS)) ]) } catch (err) { if (err && err.code === 'SHUTDOWN_TIMEOUT') { try { logger.warn('graceful shutdown timed out after ' + SHUTDOWN_TIMEOUT_MS + 'ms, forcing stop') } catch (eW) { console.warn('nuxt-processor: failed to log shutdown timeout', eW) } await app.stop({ force: true }) } else { throw err } } try { logger.success('workers closed') } catch (e2) { console.warn('nuxt-processor: failed to log shutdown complete', e2) } } catch (err) { exitCode = 1; try { logger.error('shutdown error', err) } catch (e3) { console.warn('nuxt-processor: failed to log shutdown error', e3) } } finally { setTimeout(() => process.exit(exitCode), 0) } }\n`
    + `[ 'SIGINT','SIGTERM','SIGQUIT' ].forEach(sig => process.on(sig, () => shutdown(sig)))\n`
}
