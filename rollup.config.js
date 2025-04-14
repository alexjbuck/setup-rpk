// See: https://rollupjs.org/introduction/

import commonjs from '@rollup/plugin-commonjs'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const config = {
  input: 'src/index.js',
  output: {
    esModule: true,
    file: 'dist/index.js',
    format: 'es',
    sourcemap: true,
    sourcemapExcludeSources: false,
    // Use absolute paths in source maps to ensure consistency across environments
    sourcemapPathTransform: (relativeSourcePath) => {
      return resolve(__dirname, relativeSourcePath)
    }
  },
  plugins: [commonjs(), nodeResolve({ preferBuiltins: true })]
}

export default config
