import { parseArgs } from 'util';
import { runBuild } from './build.js';
import { runTypecheck } from './typecheck.js';

let { values: options } = parseArgs({
  args: Bun.argv,
  options: {
    ts: {
      type: 'boolean'
    }
  },
  strict: true,
  allowPositionals: true
});

async function rebuild() {
  let start = Bun.nanoseconds();
  let result = await runBuild(true);
  let timeSpent = Math.floor((Bun.nanoseconds() - start) / 100_000) / 10;

  let bundlePath = result.outputs.find(x => x.kind == 'entry-point').path;
  console.log(`[${new Date().toUTCString()}] Built ${bundlePath} in ${timeSpent} ms`);

  if (options.ts) {
    setTimeout(() => {
      let start2 = Bun.nanoseconds();
      let result = runTypecheck();
      let timeSpent = Math.floor((Bun.nanoseconds() - start) / 100_000) / 10;

      console.log(`[${new Date().toUTCString()}] Type-checked TypeScript in ${timeSpent} ms`);

      if (!result.ok) {
        console.error("\n" + result.text);
      }
    }, 75);
  }
}

rebuild().catch(err => {
  console.log(err);
});

Bun.serve({
  routes: {
    '/': {
      async GET(req) {
        await rebuild();
        return new Response(Bun.file("./index.html"));
      }
    }
  },
  async fetch(req) {
    let url = new URL(req.url);
    let file = Bun.file(`.${url.pathname}`);
    return new Response(file);
  }
});
