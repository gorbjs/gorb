import typescript from '@rollup/plugin-typescript';

const input = 'src/index.ts';

export default [
  {
    input,
    output: [
      { file: 'dist/index.cjs', format: 'cjs' },
      { file: 'dist/index.mjs', format: 'esm' }
    ],
    external: ['fs', 'path', 'util', 'buffer', 'stream', '@gorb/shared', 'micromatch', '@parcel/watcher', '@parcel/source-map'],
    plugins: [
      typescript({ removeComments: true })
    ]
  }
];
