import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { WalletContextProvider } from '@/components/WalletProvider';
import Header from '@/components/Header';
import './globals.css';

export const metadata: Metadata = {
  title: 'ATTENTION COIN | Earn SOL for Driving Attention',
  description: 'Get rewarded for creating quality content. Post about $ATTENTION on X and earn SOL based on real engagement.',
  keywords: ['solana', 'memecoin', 'attention', 'earn crypto', 'twitter rewards'],
  openGraph: {
    title: 'ATTENTION COIN',
    description: 'Earn SOL for driving attention. Post quality content, get rewarded.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ATTENTION COIN',
    description: 'Earn SOL for driving attention',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-white antialiased">
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
                background: '#111',
                border: '1px solid #262626',
                color: '#fff',
              },
            }}
          />
        </WalletContextProvider>
      </body>
    </html>
  );
}
