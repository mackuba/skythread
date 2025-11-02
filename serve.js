import { runBuild } from './build.js';

Bun.serve({
  routes: {
    '/': {
      async GET(req) {
        await runBuild(true);
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
