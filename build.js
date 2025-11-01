import { parseArgs } from 'util';
import { SveltePlugin } from 'bun-plugin-svelte';

const { values } = parseArgs({
  args: Bun.argv,
  options: {
    dev: {
      type: 'boolean',
    }
  },
  strict: true,
  allowPositionals: true
});

await Bun.build({
  entrypoints: ['src/skythread.js'],
  outdir: 'dist',
  format: 'iife',
  minify: true,
  sourcemap: true,
  plugins: [
    SveltePlugin({
      // When `true`, this plugin will generate development-only checks and other niceties.
      // When `false`, this plugin will generate production-ready code
      development: values.dev,
    })
  ]
});
