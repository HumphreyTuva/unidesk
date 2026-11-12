import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

// Private or useless-to-index areas. Everything else is open, including the API's public reads, because search engines need them to
// render pages that load their lists in the browser.
const PRIVATE = ['/admin', '/account', '/chat', '/login', '/campus/advertise', '/campus/ads', '/api/v1/admin/', '/api/v1/auth/', '/api/v1/papers/*/download'];

// Search and AI assistants that can quote or link to UniDesk. Allowed on purpose, so students asking an AI about KU papers or offices can find us.
const AI = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'CCBot', 'Bytespider'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: PRIVATE },
      ...AI.map(userAgent => ({ userAgent, allow: '/', disallow: PRIVATE })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
