'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useUser } from './WalletProvider';
import { truncateWallet, isAdminWallet } from '@/lib/utils';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

// Lightning Logo - preserved brand identity
function Logo({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M13 2L4.09 12.11C3.95 12.28 3.86 12.49 3.86 12.72C3.86 13.22 4.27 13.63 4.77 13.63H11L10 22L18.91 11.89C19.05 11.72 19.14 11.51 19.14 11.28C19.14 10.78 18.73 10.37 18.23 10.37H12L13 2Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function Header() {
  const pathname = usePathname();
  const { publicKey, connected } = useWallet();
  const { user } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = isAdminWallet(publicKey?.toBase58() || null);

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/dashboard', label: 'Dashboard', requiresAuth: true },
    { href: '/payouts', label: 'Payouts', requiresAuth: true },
    { href: '/leaderboard', label: 'Leaderboard' },
    ...(isAdmin ? [{ href: '/admin', label: 'Admin', requiresAuth: true }] : []),
  ];

  const visibleNavItems = navItems.filter(
    item => !item.requiresAuth || connected
  );

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 flex items-center justify-center">
              <Logo className="w-6 h-6 text-foreground" />
            </div>
            <span className="font-display text-base tracking-tight text-foreground">
              ATTENTION
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {visibleNavItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 rounded-lg text-sm transition-colors duration-200 ${
                  pathname === item.href
                    ? 'text-foreground bg-surface'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {connected && user?.x_username && (
              <div className="hidden sm:flex items-center px-3 py-1.5 text-sm text-muted">
                @{user.x_username}
              </div>
            )}

            <WalletMultiButton />

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-muted hover:text-foreground transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <nav className="flex flex-col gap-1">
              {visibleNavItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-3 rounded-lg text-sm transition-colors duration-200 ${
                    pathname === item.href
                      ? 'text-foreground bg-surface'
                      : 'text-muted hover:text-foreground'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
