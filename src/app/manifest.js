export default function manifest() {
  return {
    name: 'LIVORA',
    short_name: 'LIVORA',
    description: 'LIVE. BETTER. EVERY DAY. – Fitness, Gaming, KI, Ernährung und Lifestyle.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0F1113',
    theme_color: '#0F1113',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
