'use client';

import { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { toast } from 'sonner';
import { useUser } from '@/components/WalletProvider';

export default function ClaimAddress() {
  const { user, isAuthenticated } = useUser();
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isAuthenticated || !user) return null;

  const saveAddress = async () => {
    try {
      setLoading(true);

      // Validate Solana address
      new PublicKey(address);

      console.log('Setting payout address:', { x_username: user.x_username, address });

      const res = await fetch('/api/user/payout-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          x_username: user.x_username,
          payout_address: address 
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save address');
      }

      toast.success('Payout address saved');
    } catch (err: any) {
      toast.error(err.message || 'Invalid Solana address');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-secondary p-4 mt-6">
      <h3 className="font-semibold text-foreground mb-2">Payout Address</h3>
      <p className="text-sm text-muted mb-3">
        Enter the Solana address where rewards will be sent.
      </p>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Solana address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="input-dark flex-1"
        />
        <button
          onClick={saveAddress}
          disabled={loading}
          className="btn-primary"
        >
          {loading ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
