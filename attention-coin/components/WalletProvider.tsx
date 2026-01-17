'use client';

import { FC, ReactNode, useMemo, createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ConnectionProvider, WalletProvider, useWallet } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import type { User } from '@/types';
import { supabase, getUserByWallet, upsertUser } from '@/lib/supabase';

// Import wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

// User context
interface UserContextType {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  signMessage: (message: string) => Promise<Uint8Array | null>;
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  refreshUser: async () => {},
  signMessage: async () => null,
});

export const useUser = () => useContext(UserContext);

// Inner provider that uses wallet hooks
function UserProviderInner({ children }: { children: ReactNode }) {
  const { publicKey, signMessage: walletSignMessage, connected } = useWallet();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!publicKey) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const walletAddress = publicKey.toBase58();
      let existingUser = await getUserByWallet(walletAddress);

      if (!existingUser) {
        // Create new user
        existingUser = await upsertUser(walletAddress);
      }

      setUser(existingUser);
    } catch (error) {
      console.error('Error refreshing user:', error);
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  // Sign message helper
  const signMessage = useCallback(async (message: string): Promise<Uint8Array | null> => {
    if (!walletSignMessage) return null;
    try {
      const encodedMessage = new TextEncoder().encode(message);
      return await walletSignMessage(encodedMessage);
    } catch (error) {
      console.error('Error signing message:', error);
      return null;
    }
  }, [walletSignMessage]);

  // Refresh user when wallet changes
  useEffect(() => {
    refreshUser();
  }, [refreshUser, connected]);

  return (
    <UserContext.Provider value={{ user, loading, refreshUser, signMessage }}>
      {children}
    </UserContext.Provider>
  );
}

// Main Wallet Provider
export const WalletContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
  // Use devnet for testing, mainnet for production
  const endpoint = useMemo(() => {
    if (process.env.NEXT_PUBLIC_SOLANA_RPC) {
      return process.env.NEXT_PUBLIC_SOLANA_RPC;
    }
    return clusterApiUrl('devnet');
  }, []);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <UserProviderInner>
            {children}
          </UserProviderInner>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
