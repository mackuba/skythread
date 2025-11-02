import { runBuild } from './build.js';

Bun.serve({
  routes: {
    '/': {
      async GET(req) {
        let start = Bun.nanoseconds();
        let result = await runBuild(true);
        let timeSpent = Bun.nanoseconds() - start;
        let ms = Math.floor(timeSpent / 100_000) / 10;
        
        console.log(`[${new Date().toUTCString()}] Built ${result.outputs.find(x => x.kind == 'entry-point').path} in ${ms} ms`);

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
