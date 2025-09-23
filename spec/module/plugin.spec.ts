import { describe, it, expect, vi, beforeEach } from 'vitest'

// Capture addTemplate/addServerPlugin calls
const addTemplateMock = vi.fn()
const addServerPluginMock = vi.fn()
const addTypeTemplateMock = vi.fn()
const createResolverMock = vi.fn(() => ({ resolve: (...p: string[]) => p.filter(Boolean).join('/') }))

vi.mock('@nuxt/kit', () => {
  const actual = {} as typeof import('@nuxt/kit')
  return {
    ...actual,
    addTemplate: (arg: unknown) => addTemplateMock(arg as unknown),
    addServerPlugin: (arg: unknown) => addServerPluginMock(arg as unknown),
    addTypeTemplate: (arg: unknown) => addTypeTemplateMock(arg as unknown),
    createResolver: () => createResolverMock(),
    // Bypass Nuxt version checks by stubbing defineNuxtModule to directly call setup
    defineNuxtModule: (opts: { defaults?: unknown, setup?: (o: unknown, n: unknown) => unknown }) => {
      return async (modOptions: unknown, nuxt: unknown) => {
        const provided = modOptions ?? opts?.defaults ?? {}
        if (typeof opts?.setup === 'function') {
          await opts.setup(provided, nuxt)
        }
      }
    },
  }
})

// Mock the workers util so template code reference is stable (we don't execute it here)
vi.mock('../../src/runtime/server/utils/workers', () => ({ $workers: vi.fn() }))

// Import after mocks
// eslint-disable-next-line import/first
import NuxtProcessorModule from '../../src/module'

describe('nuxt-processor: server plugin generation', () => {
  beforeEach(() => {
    addTemplateMock.mockClear()
    addServerPluginMock.mockClear()
    addTypeTemplateMock.mockClear()
  })

  it('writes runtimeConfig, emits server plugin and registers it from buildDir', async () => {
    const nuxt: { options: { buildDir: string, alias: Record<string, string>, runtimeConfig: Record<string, unknown> }, hooks: { hook: ReturnType<typeof vi.fn> } } = {
      options: {
        buildDir: '/tmp/.nuxt',
        alias: {},
        runtimeConfig: {},
      },
      hooks: { hook: vi.fn() },
    }

    const moduleOptions: { redis: { url: string, db: number }, workers: string } = {
      redis: { url: 'redis://example:6379/0', db: 0 },
      workers: 'server/workers',
    }

    await (NuxtProcessorModule as unknown as (o: unknown, n: unknown) => Promise<void>)(moduleOptions, nuxt)

    // runtimeConfig is populated
    type RC = { processor: { redis: Record<string, unknown> } }
    expect((nuxt.options.runtimeConfig as RC).processor.redis).toEqual(
      expect.objectContaining({ url: 'redis://example:6379/0', db: 0 }),
    )

    // Plugin template is created
    expect(addTemplateMock).toHaveBeenCalled()
    const templateArg = addTemplateMock.mock.calls.find(Boolean)?.[0] as { filename: string, getContents: () => string }
    expect(templateArg).toBeTruthy()
    expect(templateArg.filename).toBe('0.processor-nuxt-plugin.ts')

    const pluginCode = templateArg.getContents()
    expect(pluginCode).toContain(`defineNitroPlugin`)
    // Reads from runtimeConfig and calls setConnection
    expect(pluginCode).toContain(`useRuntimeConfig`)
    expect(pluginCode).toContain(`$workers().setConnection`)

    // Registered using buildDir path
    expect(addServerPluginMock).toHaveBeenCalledWith('0.processor-nuxt-plugin')
  })
})
