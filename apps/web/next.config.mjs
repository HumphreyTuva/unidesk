/** @type {import('next').NextConfig} */
const API = (process.env.API_URL || 'http://localhost:4000').replace(/\/$/, '');

const nextConfig = {
  reactStrictMode: true,
  // The browser only ever talks to this site's own /api/v1. Next.js forwards it to the NestJS server.
  // That keeps the sign-in cookie first-party, so it works on every phone browser (Safari blocks third-party cookies).
  async rewrites() {
    return [{ source: '/api/v1/:path*', destination: `${API}/api/v1/:path*` }];
  },
  // pdf.js (used to make paper previews in the admin's browser) optionally wants a Node "canvas" package. We don't use it.
  webpack(config) {
    config.resolve.alias.canvas = false;
    return config;
  },
  async headers() {
    return [
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
    ];
  },
};

export default nextConfig;
