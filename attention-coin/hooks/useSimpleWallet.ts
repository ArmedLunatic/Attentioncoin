'use client';

import { useState, useEffect } from 'react';

export interface SimpleWalletState {
  publicKey: string | null;
  connected: boolean;
  connecting: boolean;
}

export function useSimpleWallet(): SimpleWalletState & { 
  connect: () => Promise<void>; 
  disconnect: () => void; 
} {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const connect = async () => {
    if (typeof window === 'undefined' || !(window as any).solana) {
      throw new Error('Phantom wallet not installed');
    }

    setConnecting(true);
    try {
      const phantom = (window as any).solana;
      const response = await phantom.connect();
      setPublicKey(response.publicKey.toString());
      setConnected(true);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    if (typeof window !== 'undefined' && (window as any).solana) {
      try {
        await (window as any).solana.disconnect();
      } catch (error) {
        console.error('Failed to disconnect wallet:', error);
      }
    }
    setPublicKey(null);
    setConnected(false);
  };

  useEffect(() => {
    // Check if wallet is already connected
    if (typeof window !== 'undefined' && (window as any).solana) {
      const phantom = (window as any).solana;
      if (phantom.publicKey) {
        setPublicKey(phantom.publicKey.toString());
        setConnected(true);
      }

      // Listen for account changes
      const handleAccountChange = () => {
        if (phantom.publicKey) {
          setPublicKey(phantom.publicKey.toString());
          setConnected(true);
        } else {
          setPublicKey(null);
          setConnected(false);
        }
      };

      phantom.on('accountChanged', handleAccountChange);

      return () => {
        phantom.off('accountChanged', handleAccountChange);
      };
    }
  }, []);

  return {
    publicKey,
    connected,
    connecting,
    connect,
    disconnect,
  };
}