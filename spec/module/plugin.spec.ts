import { describe, it, expect, vi, beforeEach } from 'vitest'

// Capture addTemplate/addServerPlugin calls
const addTemplateMock = vi.fn()
const addServerPluginMock = vi.fn()
const addTypeTemplateMock = vi.fn()
const createResolverMock = vi.fn(() => ({ resolve: (...p: string[]) => p.filter(Boolean).join('/') }))

vi.mock('@nuxt/kit', async () => {
  const actual = await vi.importActual<any>('@nuxt/kit')
  return {
    ...actual,
    addTemplate: (...args: unknown[]) => addTemplateMock(...args),
    addServerPlugin: (...args: unknown[]) => addServerPluginMock(...args),
    addTypeTemplate: (...args: unknown[]) => addTypeTemplateMock(...args),
    createResolver: (...args: unknown[]) => createResolverMock(...args),
    // Bypass Nuxt version checks by stubbing defineNuxtModule to directly call setup
    defineNuxtModule: (opts: any) => {
      return async (modOptions: any, nuxt: any) => {
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
import NuxtProcessorModule from '../../src/module'

describe('nuxt-processor: server plugin generation', () => {
  beforeEach(() => {
    addTemplateMock.mockClear()
    addServerPluginMock.mockClear()
    addTypeTemplateMock.mockClear()
  })

  it('writes runtimeConfig, emits server plugin and registers it from buildDir', async () => {
    const nuxt: any = {
      options: {
        buildDir: '/tmp/.nuxt',
        alias: {},
        runtimeConfig: {},
      },
      hooks: { hook: vi.fn() },
    }

    const moduleOptions = {
      redis: { url: 'redis://example:6379/0', db: 0 },
      workers: 'server/workers',
    }

    await (NuxtProcessorModule as any)(moduleOptions as any, nuxt)

    // runtimeConfig is populated
    expect(nuxt.options.runtimeConfig.processor.redis).toEqual(
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


