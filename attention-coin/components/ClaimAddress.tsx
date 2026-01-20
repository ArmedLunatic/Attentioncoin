'use client';

import { useState, useEffect } from 'react';
import { Wallet, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '@/components/WalletProvider';
import { PublicKey } from '@solana/web3.js';

/**
 * Validate a Solana address
 */
function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

export default function ClaimAddress() {
  const { user, refreshUser } = useUser();
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Initialize with existing payout address
  useEffect(() => {
    if (user?.payout_address) {
      setAddress(user.payout_address);
    }
  }, [user?.payout_address]);

  const hasSavedAddress = !!user?.payout_address;

  const handleAddressChange = (value: string) => {
    setAddress(value);
    setValidationError('');

    // Validate on change if there's content
    if (value.trim() && !isValidSolanaAddress(value.trim())) {
      setValidationError('Invalid Solana address format');
    }
  };

  const handleSave = async () => {
    const trimmedAddress = address.trim();

    if (!trimmedAddress) {
      toast.error('Please enter a Solana address');
      return;
    }

    if (!isValidSolanaAddress(trimmedAddress)) {
      toast.error('Invalid Solana address format');
      return;
    }

    if (!user?.x_username) {
      toast.error('Please verify your X account first');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/user/payout-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: user.x_username,
          payout_address: trimmedAddress,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save address');
      }

      toast.success('Payout address saved successfully!');
      setIsEditing(false);

      // Refresh user data to get updated payout_address
      await refreshUser();
    } catch (error) {
      console.error('Save address error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save address');
    } finally {
      setLoading(false);
    }
  };

  const truncateAddress = (addr: string) => {
    if (addr.length <= 16) return addr;
    return `${addr.slice(0, 8)}...${addr.slice(-8)}`;
  };

  // Show saved state
  if (hasSavedAddress && !isEditing) {
    return (
      <div className="p-4 rounded-xl bg-surface border border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Check className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="font-medium">Payout Address</span>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="text-sm text-muted hover:text-white transition-colors"
          >
            Edit
          </button>
        </div>
        <p className="text-sm text-muted font-mono">
          {truncateAddress(user.payout_address!)}
        </p>
        <p className="text-xs text-muted mt-2">
          SOL payouts will be sent to this address
        </p>
      </div>
    );
  }

  // Show input state
  return (
    <div className="p-4 rounded-xl bg-surface border border-border">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Wallet className="w-4 h-4 text-primary" />
        </div>
        <div>
          <span className="font-medium">
            {hasSavedAddress ? 'Update Payout Address' : 'Set Payout Address'}
          </span>
          <p className="text-xs text-muted">
            Enter your Solana address to receive payouts
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <input
            type="text"
            placeholder="Enter Solana address (e.g., 7xKX...)"
            value={address}
            onChange={(e) => handleAddressChange(e.target.value)}
            className={`input-dark w-full font-mono text-sm ${
              validationError ? 'border-red-500/50 focus:border-red-500' : ''
            }`}
            disabled={loading}
          />
          {validationError && (
            <div className="flex items-center gap-1 mt-1.5 text-red-400 text-xs">
              <AlertCircle className="w-3 h-3" />
              {validationError}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={loading || !address.trim() || !!validationError}
            className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4" />
                Save Address
              </>
            )}
          </button>
          {isEditing && (
            <button
              onClick={() => {
                setIsEditing(false);
                setAddress(user?.payout_address || '');
                setValidationError('');
              }}
              disabled={loading}
              className="btn-secondary px-4"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-muted mt-3">
        Make sure this is a valid Solana address you control. Payouts cannot be reversed.
      </p>
    </div>
  );
}
