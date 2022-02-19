/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
import { build } from 'esbuild'
import { htmlPlugin } from '@craftamap/esbuild-plugin-html'
import esbuildMxnCopy from 'esbuild-plugin-mxn-copy'
import aliasPlugin from 'esbuild-plugin-path-alias'
import path from 'path'
import fs from 'fs'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'

const env = fs.existsSync('.env') ? dotenv.config() : { parsed: {} }
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const { version } = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json')))
const isDevelopment = Boolean(process.argv[2] === '--dev')

const plugins = [
  htmlPlugin({
    files: [
      {
        entryPoints: ['src/index.jsx'],
        filename: 'index.html',
        htmlTemplate: fs.readFileSync('./public/index.template.html'),
        scriptLoading: 'defer',
        favicon: './public/favicon/favicon.ico',
      },
    ],
  }),
  esbuildMxnCopy({
    copy: [
      { from: 'public/images', to: 'dist/' },
      { from: 'public/locales', to: 'dist/' },
    ],
  }),
  aliasPlugin({
    '@components': path.resolve(__dirname, './src/components'),
    '@assets': path.resolve(__dirname, './src/assets'),
    '@hooks': path.resolve(__dirname, './src/hooks'),
    '@services': path.resolve(__dirname, './src/services'),
  }),
]

if (!isDevelopment) {
  plugins.push(
    {
      name: 'Clean Plugin',
      setup(b) {
        b.onStart(() => {
          console.log('Cleaning up old build...')
          fs.rm(b.initialOptions.outdir, { recursive: true }, (err) => {
            if (err) console.log(err)
          })
        })
      },
    },
    {
      name: 'Compiling Plugin',
      setup(b) {
        b.onStart(() => {
          console.log(`Building ${isDevelopment ? 'development' : 'production'} version ${version}`)
        })
      },
    },
  )
}

try {
  await build({
    entryPoints: ['src/index.jsx'],
    legalComments: 'none',
    bundle: true,
    outdir: 'dist/',
    metafile: true,
    minify: !isDevelopment,
    logLevel: isDevelopment ? 'info' : 'error',
    watch: isDevelopment
      ? {
        onRebuild(error) {
          if (error) console.error('Recompiling failed:', error)
          else console.log('Recompiled successfully')
        },
      }
      : false,
    sourcemap: isDevelopment,
    define: {
      inject: JSON.stringify({
        ...env.parsed,
        VERSION: version,
        DEVELOPMENT: isDevelopment,
      }),
    },
    plugins,
  })
} catch (e) {
  console.error(e)
  process.exit(1)
} finally {
  console.log('React Map Compiled')
}
