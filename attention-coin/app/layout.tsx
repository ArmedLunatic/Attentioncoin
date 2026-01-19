import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Toaster } from 'sonner';
import { WalletContextProvider } from '@/components/WalletProvider';
import Header from '@/components/Header';
import './globals.css';

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
    <html lang="en" className={`dark ${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen bg-background text-foreground antialiased font-sans">
        {/* Subtle atmospheric gradient - restrained, not decorative */}
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 50% at 50% -20%, rgba(4, 120, 87, 0.08) 0%, transparent 60%),
              #060608
            `,
          }}
          aria-hidden="true"
        />

        <WalletContextProvider>
          <Header />
          <main className="pt-[72px] relative z-10">
            {children}
          </main>
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#0c0c10',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                color: '#f4f4f5',
                fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
              },
            }}
          />
        </WalletContextProvider>
      </body>
    </html>
  );
}
