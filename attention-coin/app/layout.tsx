import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import { WalletContextProvider } from '@/components/WalletProvider';
import Header from '@/components/Header';
import './globals.css';

// Primary font - Inter for body text
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

// Display font - Inter Tight for headlines
const interTight = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter-tight',
  weight: ['500', '600', '700'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://attention-coin.vercel.app'),
  title: 'ATTENTION | Earn SOL for Driving Attention',
  description: 'Get rewarded for creating quality content. Post about $ATTENTION on X and earn SOL based on real engagement.',
  keywords: ['solana', 'memecoin', 'attention', 'earn crypto', 'twitter rewards'],
  openGraph: {
    title: 'ATTENTION',
    description: 'Earn SOL for driving attention. Post quality content, get rewarded.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ATTENTION',
    description: 'Earn SOL for driving attention',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${interTight.variable}`}>
      <body className="min-h-screen bg-background text-foreground antialiased font-sans">
        <WalletContextProvider>
          <Header />
          <main className="pt-16">
            {children}
          </main>
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#121214',
                border: '1px solid #27272a',
                color: '#fafaf9',
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
              },
            }}
          />
        </WalletContextProvider>
      </body>
    </html>
  );
}
