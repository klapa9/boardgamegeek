import type { Metadata } from 'next';

export const siteConfig = {
  name: 'boardgamecrew.nl',
  url: 'https://boardgamecrew.nl',
  locale: 'nl_NL',
  defaultTitle: 'Bordspelavond plannen en je spellenverzameling beheren',
  description:
    'Plan bordspelavonden, verzamel beschikbaarheid, laat vrienden stemmen op spellen en houd je bordspellenverzameling overzichtelijk.',
  ogImage: '/branding/boardgamecrew-full.png'
} as const;

type SeoMetadataInput = {
  title?: string;
  description?: string;
  path?: string;
  index?: boolean;
};

function robotsDirectives(index: boolean): NonNullable<Metadata['robots']> {
  return index
    ? {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-image-preview': 'large',
          'max-snippet': -1,
          'max-video-preview': -1
        }
      }
    : {
        index: false,
        follow: false,
        googleBot: {
          index: false,
          follow: false,
          'max-image-preview': 'none',
          'max-snippet': 0,
          'max-video-preview': 0
        }
      };
}

export function createMetadata({ title, description = siteConfig.description, path, index = true }: SeoMetadataInput = {}): Metadata {
  const resolvedTitle = title ?? siteConfig.defaultTitle;

  return {
    title: resolvedTitle,
    description,
    alternates: path ? { canonical: path } : undefined,
    openGraph: {
      type: 'website',
      locale: siteConfig.locale,
      siteName: siteConfig.name,
      title: resolvedTitle,
      description,
      url: path,
      images: [{ url: siteConfig.ogImage, alt: siteConfig.defaultTitle }]
    },
    twitter: {
      card: 'summary_large_image',
      title: resolvedTitle,
      description,
      images: [siteConfig.ogImage]
    },
    robots: robotsDirectives(index)
  };
}

export function getHomeStructuredData() {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: siteConfig.name,
      url: siteConfig.url,
      inLanguage: 'nl',
      description: siteConfig.description
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: siteConfig.name,
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Web',
      url: siteConfig.url,
      inLanguage: 'nl',
      description: siteConfig.description,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'EUR'
      },
      featureList: [
        'Bordspelavonden plannen met datumopties',
        'Beschikbaarheid verzamelen van deelnemers',
        'Samen stemmen op spellen',
        'Bordspellenverzameling beheren en organiseren'
      ],
      isAccessibleForFree: true,
      image: `${siteConfig.url}${siteConfig.ogImage}`
    }
  ];
}
