import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import dts from 'rollup-plugin-dts';

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
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.build.json',
        declaration: false,
        sourceMap: true,
      }),
    ],
    external: [
      'google-protobuf',
      'mirador-gateway-parallax-web',
      /^mirador-gateway-parallax-web\/.*/,
      'rxjs',
      /^rxjs\/.*/,
    ],
  },
  // Bundle the JavaScript/TypeScript code for UMD (browser global)
  {
    input: 'index.ts',
    output: {
      file: 'dist/index.umd.js',
      format: 'umd',
      name: 'ParallaxWeb',
      sourcemap: true,
      globals: {
        'google-protobuf': 'googleProtobuf',
        'mirador-gateway-parallax-web': 'miradorGatewayParallaxWeb',
        'mirador-gateway-parallax-web/proto/gateway/parallax/v1/parallax_gateway': 'miradorGatewayParallaxWeb.parallaxGateway',
        'rxjs': 'rxjs',
      },
    },
    plugins: [
      resolve({
        browser: true,
        preferBuiltins: false,
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.build.json',
        declaration: false,
        sourceMap: true,
      }),
    ],
    external: [
      'google-protobuf',
      'mirador-gateway-parallax-web',
      /^mirador-gateway-parallax-web\/.*/,
      'rxjs',
      /^rxjs\/.*/,
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
      'google-protobuf',
      'mirador-gateway-parallax-web',
      /^mirador-gateway-parallax-web\/.*/,
      'rxjs',
      /^rxjs\/.*/,
    ],
  },
];
