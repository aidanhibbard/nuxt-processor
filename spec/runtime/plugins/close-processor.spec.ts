import { describe, it, expect, vi, beforeEach } from 'vitest'

const { stopAll, mockConsolaError } = vi.hoisted(() => ({
  stopAll: vi.fn().mockResolvedValue({ ok: true, errors: [] }),
  mockConsolaError: vi.fn(),
}))

vi.mock('consola', () => ({
  consola: {
    create: () => ({
      withTag: () => ({
        error: mockConsolaError,
      }),
    }),
  },
}))

vi.mock('nitropack/runtime', () => ({
  defineNitroPlugin: (plugin: (nitroApp: { hooks: { hook: ReturnType<typeof vi.fn> } }) => void) => plugin,
}))

vi.mock('../../../src/runtime/server/utils/workers', () => ({
  useProcessor: () => ({ stopAll }),
}))

const importCloseProcessor = () => import('../../../src/runtime/server/plugins/close-processor')

describe('close-processor plugin', () => {
  beforeEach(() => {
    stopAll.mockClear()
    mockConsolaError.mockClear()
    stopAll.mockResolvedValue({ ok: true, errors: [] })
  })

  it('registers close hook on nitroApp', async () => {
    const { default: closeProcessor } = await importCloseProcessor()
    const nitroApp = {
      hooks: {
        hook: vi.fn(),
      },
    }

    closeProcessor(nitroApp as never)

    expect(nitroApp.hooks.hook).toHaveBeenCalledWith('close', expect.any(Function))
  })

  it('calls useProcessor().stopAll() when close hook runs', async () => {
    const { default: closeProcessor } = await importCloseProcessor()
    const nitroApp = {
      hooks: {
        hook: vi.fn(),
      },
    }

    closeProcessor(nitroApp as never)

    const closeHandler = nitroApp.hooks.hook.mock.calls.find(([name]) => name === 'close')?.[1]
    expect(closeHandler).toBeDefined()

    await closeHandler!()

    expect(stopAll).toHaveBeenCalledOnce()
  })

  it('logs errors when stopAll returns failures', async () => {
    const closeError = new Error('queue close failed')
    stopAll.mockResolvedValueOnce({ ok: false, errors: [closeError] })

    const { default: closeProcessor } = await importCloseProcessor()
    const nitroApp = {
      hooks: {
        hook: vi.fn(),
      },
    }

    closeProcessor(nitroApp as never)

    const closeHandler = nitroApp.hooks.hook.mock.calls.find(([name]) => name === 'close')?.[1]
    await closeHandler!()

    expect(mockConsolaError).toHaveBeenCalledWith(
      'Failed to close processor resource on Nitro shutdown',
      closeError,
    )
  })
})
