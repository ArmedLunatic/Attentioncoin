'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from './WalletProvider';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

// Lightning Logo
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
  const { user, isAuthenticated, logout } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/dashboard', label: 'Dashboard', requiresAuth: true },
    { href: '/payouts', label: 'Payouts', requiresAuth: true },
    { href: '/leaderboard', label: 'Leaderboard' },
   ];

  const visibleNavItems = navItems.filter(
   item => !item.requiresAuth || isAuthenticated

  );

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-white/[0.04]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-[72px]">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <Logo className="w-5 h-5 text-emerald-500" />
            <span className="font-display text-body-sm text-foreground">
              ATTENTION
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {visibleNavItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-lg text-body-sm transition-colors duration-150 ${
                  pathname === item.href
                    ? 'text-foreground bg-white/[0.04]'
                    : 'text-text-tertiary hover:text-foreground'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
<a
  href="https://x.com/i/communities/2013663619725365292"
  target="_blank"
  rel="noopener noreferrer"
  className="hidden md:inline-flex px-3 py-2 rounded-lg text-body-sm text-text-tertiary hover:text-foreground transition-colors"
>
  Community
</a>

           {isAuthenticated && user?.x_username && (
  <div className="hidden sm:block text-body-sm text-text-tertiary">
    @{user.x_username}
  </div>
)}
          {isAuthenticated ? (
  <div className="flex items-center gap-3">
    <span className="text-sm text-muted">@{user?.x_username}</span>
    <button
      onClick={logout}
      className="px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-surface-light"
    >
      Logout
    </button>
  </div>
) : (
  <Link
    href="/login"
    className="px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium"
  >
    Get Started
  </Link>
)}


            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-text-tertiary hover:text-foreground transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/[0.04]">
<a
  href="https://x.com/i/communities/2013663619725365292"
  target="_blank"
  rel="noopener noreferrer"
  onClick={() => setMobileMenuOpen(false)}
  className="px-3 py-3 rounded-lg text-body-sm text-text-tertiary hover:text-foreground"
>
  Community
</a>

            <nav className="flex flex-col gap-1">
              {visibleNavItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-3 rounded-lg text-body-sm transition-colors duration-150 ${
                    pathname === item.href
                      ? 'text-foreground bg-white/[0.04]'
                      : 'text-text-tertiary hover:text-foreground'
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
