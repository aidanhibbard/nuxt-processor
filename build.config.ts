import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  rollup: {
    emitCJS: true,
    cjsBridge: false,
  },
  entries: [
    'src/cli',
  ],
})
