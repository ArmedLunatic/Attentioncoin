'use client';

import { useEffect, useState } from 'react';

export default function SimpleTest() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [message, setMessage] = useState('Loading...');

  useEffect(() => {
    console.log('🔍 SimpleTest component mounted');
    
    // Check if Phantom is available
    if (typeof window !== 'undefined') {
      console.log('🔍 Window defined');
      
      if ((window as any).solana) {
        console.log('✅ Phantom wallet found');
        setWalletConnected(true);
        setMessage('✅ Phantom wallet is available!');
      } else {
        console.log('❌ Phantom wallet not found');
        setMessage('❌ Phantom wallet not installed');
      }
    } else {
      console.log('❌ Window undefined');
      setMessage('❌ Running on server');
    }
  }, []);

  const connectWallet = async () => {
    if ((window as any).solana) {
      try {
        const response = await (window as any).solana.connect();
        console.log('✅ Connected to:', response.publicKey.toString());
        alert('Connected! Public key: ' + response.publicKey.toString());
      } catch (error) {
        console.error('Connection failed:', error);
        alert('Connection failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-md mx-auto bg-surface/80 border border-border rounded-2xl p-8">
        <h1 className="text-2xl font-bold mb-4">Simple Wallet Test</h1>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted mb-2">Window Status:</p>
            <p className="font-mono">{typeof window !== 'undefined' ? '✅ Client' : '❌ Server'}</p>
          </div>
          
          <div>
            <p className="text-sm text-muted mb-2">Phantom Wallet:</p>
            <p className="font-mono">{walletConnected ? '✅ Connected' : '❌ Not Found'}</p>
          </div>
          
          <div>
            <p className="text-lg font-bold">{message}</p>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={connectWallet}
            className="px-4 py-2 bg-primary text-black rounded-lg font-semibold hover:bg-primary/80"
          >
            Connect Phantom
          </button>
          
          <button
            onClick={() => window.location.href = '/admin'}
            className="px-4 py-2 bg-surface border border-border text-muted rounded-lg font-semibold hover:bg-surface-light"
          >
            Go to Admin Page
          </button>
        </div>
      </div>
    </div>
  );
}