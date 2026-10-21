/**
 * Cloudflare Worker Entry Point
 * Handles API routes using D1 binding `env.DB` and serves static frontend assets.
 */

// Cloudflare Workers D1 Database type
export interface D1Database {
  prepare: (query: string) => any;
  dump: () => Promise<ArrayBuffer>;
  batch: (statements: any[]) => Promise<any[]>;
  exec: (query: string) => Promise<any>;
}

export interface Env {
  DB: D1Database;
  ENVIRONMENT: string;
  FACILITY_NAME: string;
  TIMEZONE: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // API Route Dispatcher
    if (url.pathname.startsWith('/api/')) {
      // In production Cloudflare Workers, requests can be routed to worker API handlers
      return new Response(JSON.stringify({ message: "Convee Patient Monitoring Worker API Active", env: env.ENVIRONMENT }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Static asset fetch fallback
    return new Response('Patient Monitoring System Static Asset Handler', { status: 200 });
  },
};
