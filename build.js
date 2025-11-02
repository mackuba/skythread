import { parseArgs } from 'util';
import { SveltePlugin } from 'bun-plugin-svelte';

function buildOptions(devMode) {
  return {
    entrypoints: ['src/skythread.js'],
    outdir: 'dist',
    format: 'iife',
    minify: true,
    sourcemap: true,
    plugins: [
      SveltePlugin({
        // When `true`, this plugin will generate development-only checks and other niceties.
        // When `false`, this plugin will generate production-ready code
        development: devMode,
      })
    ]
  };
}

async function runBuild(devMode) {
  let options = buildOptions(devMode);
  return await Bun.build(options);
}

if (import.meta.main) {
  let { values: options } = parseArgs({
    args: Bun.argv,
    options: {
      dev: {
        type: 'boolean'
      }
    },
    strict: true,
    allowPositionals: true
  });

  await runBuild(options.dev);
}

export { buildOptions, runBuild };
