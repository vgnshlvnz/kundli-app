// Cloudflare gateway for the Kundli App.
//
// Static files (modules/web/static plus the generated theme.css) are served from
// Workers static assets; wrangler.jsonc sends only /api/* to this script, which
// forwards it to the FastAPI backend running in one container instance.
import { Container, getContainer } from "@cloudflare/containers";

export class KundliApi extends Container {
  defaultPort = 8080; // uvicorn in the Dockerfile
  sleepAfter = "10m"; // stop (and stop billing) after 10 idle minutes
  enableInternet = false; // the backend needs no outbound network
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api" || pathname.startsWith("/api/")) {
      return getContainer(env.KUNDLI_API).fetch(request);
    }
    return env.ASSETS.fetch(request);
  },
};
