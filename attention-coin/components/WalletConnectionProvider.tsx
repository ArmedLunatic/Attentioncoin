'use client';

import { ReactNode } from 'react';

// Simple wallet provider wrapper that doesn't use problematic components
export default function WalletConnectionProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}