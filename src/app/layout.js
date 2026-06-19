import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider } from '@/components/AuthProvider';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration';
import { GateProvider } from '@/components/GateProvider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-display' });

export const metadata = {
  title: 'LIVORA',
  description: 'LIVE. BETTER. EVERY DAY. – Fitness, Gaming, KI, Ernährung und Lifestyle.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'LIVORA',
  },
  icons: {
    icon: '/icon.png',
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport = {
  themeColor: '#0F1113',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className={`${inter.variable} ${spaceGrotesk.variable}`}>
        <ServiceWorkerRegistration />
        <GateProvider>
          <AuthProvider>
            <ThemeProvider>
              <div className="site-wrapper">
                <Header />
                {children}
                <Footer />
              </div>
            </ThemeProvider>
          </AuthProvider>
        </GateProvider>
      </body>
    </html>
  );
}