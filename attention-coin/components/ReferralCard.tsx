'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Users, Gift, Share2, Twitter } from 'lucide-react';
import { toast } from 'sonner';
import { formatSol } from '@/lib/utils';

interface ReferralCardProps {
  referralCode: string;
  totalReferrals: number;
  referralEarnings: number; // in lamports
  compact?: boolean;
}

export default function ReferralCard({
  referralCode,
  totalReferrals,
  referralEarnings,
  compact = false,
}: ReferralCardProps) {
  const [copied, setCopied] = useState(false);

  const referralLink = typeof window !== 'undefined'
    ? `${window.location.origin}?ref=${referralCode}`
    : `https://attention-coin.vercel.app?ref=${referralCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success('Referral link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast.success('Referral code copied!');
  };

  const shareOnTwitter = () => {
    const text = `Join me on @AttentionCoin and earn SOL for your tweets! 🚀\n\nUse my referral code: ${referralCode}\n\n`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(referralLink)}`;
    window.open(url, '_blank');
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-border">
        <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
          <Users className="w-5 h-5 text-cyan-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">{totalReferrals} Referrals</div>
          <div className="text-xs text-muted truncate">Code: {referralCode}</div>
        </div>
        <button
          onClick={copyLink}
          className="p-2 rounded-lg bg-surface-light hover:bg-border transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-muted" />}
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 rounded-2xl bg-surface border border-border">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
          <Gift className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h3 className="font-semibold">Refer & Earn</h3>
          <p className="text-xs text-muted">Earn 10% of referral earnings</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="p-3 rounded-xl bg-surface-light text-center">
          <div className="text-2xl font-bold text-cyan-400">{totalReferrals}</div>
          <div className="text-xs text-muted">Referrals</div>
        </div>
        <div className="p-3 rounded-xl bg-surface-light text-center">
          <div className="text-2xl font-bold text-primary">{formatSol(referralEarnings)}</div>
          <div className="text-xs text-muted">Earned (SOL)</div>
        </div>
      </div>

      {/* Referral Code */}
      <div className="mb-4">
        <label className="text-xs text-muted mb-2 block">Your Referral Code</label>
        <div className="flex items-center gap-2">
          <div className="flex-1 px-4 py-3 rounded-lg bg-background border border-border font-mono text-lg tracking-wider text-center">
            {referralCode}
          </div>
          <button
            onClick={copyCode}
            className="p-3 rounded-lg bg-surface-light hover:bg-border transition-colors"
            title="Copy code"
          >
            <Copy className="w-5 h-5 text-muted" />
          </button>
        </div>
      </div>

      {/* Referral Link */}
      <div className="mb-4">
        <label className="text-xs text-muted mb-2 block">Referral Link</label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={referralLink}
            readOnly
            className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-sm text-muted truncate"
          />
          <button
            onClick={copyLink}
            className={`p-2 rounded-lg transition-colors ${
              copied ? 'bg-green-500/20 text-green-400' : 'bg-surface-light hover:bg-border text-muted'
            }`}
            title="Copy link"
          >
            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Share Buttons */}
      <div className="flex gap-2">
        <button
          onClick={copyLink}
          className="flex-1 btn-secondary flex items-center justify-center gap-2 py-2 text-sm"
        >
          <Share2 className="w-4 h-4" />
          <span className="hidden sm:inline">Copy Link</span>
          <span className="sm:hidden">Copy</span>
        </button>
        <button
          onClick={shareOnTwitter}
          className="flex-1 bg-blue-500/20 border border-blue-500/30 text-blue-400 font-medium py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-500/30 transition-colors text-sm"
        >
          <Twitter className="w-4 h-4" />
          <span className="hidden sm:inline">Share on X</span>
          <span className="sm:hidden">Tweet</span>
        </button>
      </div>
    </div>
  );
}
