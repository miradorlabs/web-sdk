import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import dts from 'rollup-plugin-dts';
import ts from 'typescript';

/**
 * Transpiles the raw TypeScript proto stubs shipped by @miradorlabs/ingest-grpc-web.
 * That package publishes its grpc-web service client (`*ServiceClientPb.ts`) as
 * raw `.ts` with no compiled `.js`. Transpiling it here lets the stub be bundled
 * into dist/, so consumers never have to resolve/transpile a `.ts` from
 * node_modules (which breaks Jest, Next.js, Vite, plain Node, etc.).
 */
function transpileDepTs() {
  return {
    name: 'transpile-dep-ts',
    transform(code, id) {
      if (!id.includes('node_modules/@miradorlabs/ingest-grpc-web/') || !id.endsWith('.ts')) {
        return null;
      }
      const { outputText, sourceMapText } = ts.transpileModule(code, {
        fileName: id,
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2020,
          sourceMap: true,
        },
      });
      return { code: outputText, map: sourceMapText ?? null };
    },
  };
}

export default [
  // Bundle the JavaScript/TypeScript code for ES module
  {
    input: 'index.ts',
    output: {
      file: 'dist/index.esm.js',
      format: 'es',
      sourcemap: true,
    },
    plugins: [
      resolve({
        browser: true,
        preferBuiltins: false,
        extensions: ['.mjs', '.js', '.json', '.node', '.ts'],
      }),
      commonjs(),
      transpileDepTs(),
      typescript({
        tsconfig: './tsconfig.build.json',
        declaration: false,
        sourceMap: true,
      }),
    ],
    // @miradorlabs/ingest-grpc-web is intentionally NOT external: it ships its
    // grpc-web service client as raw `.ts`, so it is transpiled and bundled in
    // (see transpileDepTs above). Leaving it external pushed an untranspilable
    // `.ts` from node_modules onto every consumer's bundler/runtime.
    external: [
      // Keep these as peer dependencies - users should provide them
      'rxjs',
      /^rxjs\/.*/,
      '@miradorlabs/plugins',
    ],
  },
  // Bundle the JavaScript/TypeScript code for UMD (browser global)
  {
    input: 'index.ts',
    output: {
      file: 'dist/index.umd.js',
      format: 'umd',
      name: 'MiradorWeb',
      sourcemap: true,
      globals: {
        'rxjs': 'rxjs',
      },
    },
    plugins: [
      resolve({
        browser: true,
        preferBuiltins: false,
        extensions: ['.mjs', '.js', '.json', '.node', '.ts'],
      }),
      commonjs(),
      transpileDepTs(),
      typescript({
        tsconfig: './tsconfig.build.json',
        declaration: false,
        sourceMap: true,
      }),
    ],
    // @miradorlabs/ingest-grpc-web is bundled in (transpiled — see above), not
    // external. @miradorlabs/plugins and rxjs stay external as peer deps.
    external: [
      // Keep rxjs as external - it's commonly provided
      'rxjs',
      /^rxjs\/.*/,
      '@miradorlabs/plugins',
    ],
  },
  // Bundle the TypeScript declarations
  {
    input: 'index.ts',
    output: {
      file: 'dist/index.d.ts',
      format: 'es',
    },
    plugins: [dts()],
    external: [
      'rxjs',
      /^rxjs\/.*/,
      '@miradorlabs/plugins',
      '@miradorlabs/ingest-grpc-web',
      /^@miradorlabs\/ingest-grpc-web\/.*/,
    ],
  },
];
