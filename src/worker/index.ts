export interface Env {
  DB: any;
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  ENVIRONMENT: string;
  FACILITY_NAME: string;
  TIMEZONE: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // API Routes
    if (url.pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ 
        message: "Convee Patient Monitoring Worker API Active", 
        env: env.ENVIRONMENT 
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Serve Static SPA Assets (Vite build dist)
    return env.ASSETS.fetch(request);
  },
};
