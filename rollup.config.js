import typescript from '@rollup/plugin-typescript';

const input = 'src/index.ts';

export default [
  {
    input,
    output: [
      { file: 'dist/index.cjs', format: 'cjs' },
      { file: 'dist/index.mjs', format: 'esm' }
    ],
    external: ['fs', 'path', 'util', 'buffer', 'clone'],
    plugins: [
      typescript({ removeComments: true })
    ]
  }
];
