import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/seo';

const disallowedPaths = [
  '/api/',
  '/bgg',
  '/collectie',
  '/games',
  '/offline.html',
  '/planning',
  '/sign-in',
  '/spelavond',
  '/spelavonden',
  '/spelkeuze'
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: disallowedPaths
    },
    sitemap: `${siteConfig.url}/sitemap.xml`
  };
}
