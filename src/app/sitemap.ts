import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://vadodarahackathon.pierc.org';

  const staticRoutes = [
    '/',
    '/login',
    '/register',
    '/forgot-password',
    '/privacy',
    '/terms',
  ];

  const sitemapEntries = staticRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: route === '/' ? 1 : 0.8,
  }));

  return sitemapEntries;
}
