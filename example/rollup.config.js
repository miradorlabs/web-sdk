import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import alias from '@rollup/plugin-alias';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  input: 'app.ts',
  output: {
    file: 'bundle.js',
    format: 'es',
    sourcemap: true
  },
  plugins: [
    alias({
      entries: [
        { find: '@miradorlabs/web-sdk', replacement: path.resolve(__dirname, '../dist/index.esm.js') }
      ]
    }),
    resolve({
      browser: true,
      preferBuiltins: false,
      mainFields: ['module', 'main'],
      exportConditions: ['import', 'module', 'default']
    }),
    typescript({
      tsconfig: './tsconfig.json',
      compilerOptions: {
        noEmit: false,
        declaration: false
      }
    })
  ]
};
