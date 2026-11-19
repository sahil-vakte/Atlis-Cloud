import type { MetadataRoute } from 'next';
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: 'https://atlis.cloud/', changeFrequency: 'monthly', priority: 1 }, { url: 'https://atlis.cloud/careers', changeFrequency: 'daily', priority: .8 }];
}
