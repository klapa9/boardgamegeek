import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BoardgameGeek.be',
    short_name: 'BGG.be',
    description: 'Regel eenvoudig bordspelavonden en beheer je BoardGameGeek-collectie met vrienden.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#172036',
    theme_color: '#172036',
    lang: 'nl-BE',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: '/icons/icon-192x192-maskable.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png'
      },
      {
        src: '/icons/icon-512x512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ]
  };
}
