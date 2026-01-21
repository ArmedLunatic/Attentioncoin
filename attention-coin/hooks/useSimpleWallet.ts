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
    console.log('🔗 Attempting to connect to Phantom wallet...');
    
    if (typeof window === 'undefined') {
      console.error('❌ Window is undefined');
      throw new Error('Window is not available');
    }
    
    console.log('🔍 Checking for Phantom wallet...');
    console.log('window.solana:', (window as any).solana);
    
    if (!(window as any).solana) {
      console.error('❌ Phantom wallet not installed');
      throw new Error('Phantom wallet not installed');
    }

    console.log('✅ Phantom wallet found, attempting connection...');
    setConnecting(true);
    try {
      const phantom = (window as any).solana;
      console.log('🔑 Calling phantom.connect()...');
      const response = await phantom.connect();
      console.log('🎉 Connected successfully:', response);
      setPublicKey(response.publicKey.toString());
      setConnected(true);
      console.log('✅ State updated - wallet is now connected');
    } catch (error) {
      console.error('❌ Failed to connect wallet:', error);
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
    console.log('🔍 useSimpleWallet useEffect running...');
    console.log('window:', typeof window !== 'undefined' ? 'defined' : 'undefined');
    
    // Check if wallet is already connected
    if (typeof window !== 'undefined' && (window as any).solana) {
      const phantom = (window as any).solana;
      console.log('🔍 Found phantom.solana:', phantom);
      console.log('🔍 Current publicKey:', phantom.publicKey);
      
      if (phantom.publicKey) {
        console.log('✅ Wallet already connected, setting state...');
        setPublicKey(phantom.publicKey.toString());
        setConnected(true);
      }

      // Listen for account changes
      const handleAccountChange = () => {
        console.log('🔄 Account changed event triggered');
        if (phantom.publicKey) {
          setPublicKey(phantom.publicKey.toString());
          setConnected(true);
        } else {
          setPublicKey(null);
          setConnected(false);
        }
      };

      phantom.on('accountChanged', handleAccountChange);
      console.log('👂 Added accountChanged listener');

      return () => {
        phantom.off('accountChanged', handleAccountChange);
      };
    } else {
      console.log('❌ window.solana not available');
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