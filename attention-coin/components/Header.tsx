'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useUser } from './WalletProvider';
import { truncateWallet, isAdminWallet } from '@/lib/utils';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

// Premium Logo Component - Abstract "A" with energy element
function Logo({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Abstract A shape with energy bolt */}
      <path
        d="M16 4L6 28H11L13 22H19L21 28H26L16 4Z"
        fill="currentColor"
        fillOpacity="0.9"
      />
      {/* Inner cutout for A shape */}
      <path
        d="M16 12L13.5 19H18.5L16 12Z"
        fill="#030303"
      />
      {/* Energy accent - electric element */}
      <path
        d="M20 8L17 14L21 13L18 20"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.6"
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
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-hover:from-primary/30 group-hover:to-primary/10 transition-all duration-200 shadow-sm">
              <Logo className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold text-lg tracking-tight">
              <span className="text-white">ATTENTION</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {visibleNavItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  pathname === item.href
                    ? 'bg-surface-light text-white shadow-sm'
                    : 'text-muted hover:text-white hover:bg-surface-light/60'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {connected && user?.x_username && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-light/80 border border-border">
                <span className="text-sm text-muted-light">@{user.x_username}</span>
              </div>
            )}

            <WalletMultiButton />

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-muted hover:text-white hover:bg-surface-light transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-slide-down">
            <nav className="flex flex-col gap-1">
              {visibleNavItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    pathname === item.href
                      ? 'bg-surface-light text-white'
                      : 'text-muted hover:text-white hover:bg-surface-light/60'
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
