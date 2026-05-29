import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import typescript from '@rollup/plugin-typescript';
import alias from '@rollup/plugin-alias';
import nodePolyfills from 'rollup-plugin-polyfill-node';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  input: 'app.ts',
  output: {
    file: 'bundle.js',
    format: 'es',
    sourcemap: true,
    inlineDynamicImports: true,
  },
  plugins: [
    alias({
      entries: [
        { find: '@miradorlabs/web-sdk', replacement: path.resolve(__dirname, '../../dist/index.esm.js') },
      ],
    }),
    resolve({
      browser: true,
      preferBuiltins: false,
      mainFields: ['module', 'main'],
      exportConditions: ['import', 'module', 'default'],
    }),
    commonjs(),
    json(),
    nodePolyfills(),
    typescript({
      tsconfig: './tsconfig.json',
      compilerOptions: {
        noEmit: false,
        declaration: false,
      },
    }),
  ],
};
