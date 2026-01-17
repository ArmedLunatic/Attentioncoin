'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { motion } from 'framer-motion';
import { 
  Zap, 
  ArrowRight, 
  Shield, 
  TrendingUp, 
  Users, 
  CheckCircle2,
  Twitter,
  Wallet,
  DollarSign,
  Copy,
  ExternalLink
} from 'lucide-react';
import { CONTRACT_ADDRESS, CASHTAG, truncateWallet, formatNumber } from '@/lib/utils';
import { toast } from 'sonner';

// Animated counter component
function AnimatedCounter({ value, duration = 2000 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    const increment = end / (duration / 16);
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value, duration]);

  return <span className="tabular-nums">{formatNumber(count)}</span>;
}

// Activity feed item
function ActivityItem({ username, amount, time }: { username: string; amount: number; time: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center justify-between py-3 border-b border-border/50 last:border-0"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
          <span className="text-primary text-sm font-bold">
            {username.charAt(1).toUpperCase()}
          </span>
        </div>
        <div>
          <span className="text-white font-medium">@{username}</span>
          <span className="text-muted"> earned </span>
          <span className="text-primary font-semibold">{amount.toFixed(2)} SOL</span>
        </div>
      </div>
      <span className="text-muted text-sm">{time}</span>
    </motion.div>
  );
}

export default function Home() {
  const { connected } = useWallet();
  const [copied, setCopied] = useState(false);

  const copyCA = () => {
    navigator.clipboard.writeText(CONTRACT_ADDRESS);
    setCopied(true);
    toast.success('Contract address copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Sample activity data
  const recentActivity = [
    { username: 'cryptowhale', amount: 0.45, time: '2m ago' },
    { username: 'sol_builder', amount: 0.32, time: '5m ago' },
    { username: 'defi_degen', amount: 0.28, time: '8m ago' },
    { username: 'web3_creator', amount: 0.21, time: '12m ago' },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 grid-bg opacity-30" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[128px]" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-[128px]" />

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface border border-border mb-8">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm text-muted">Now distributing rewards daily</span>
            </div>

            {/* Main headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              <span className="text-white">Earn SOL for</span>
              <br />
              <span className="gradient-text">Driving Attention</span>
            </h1>

            <p className="text-xl text-muted max-w-2xl mx-auto mb-10">
              Post about <span className="text-white font-semibold">{CASHTAG}</span> on X. 
              Get rewarded based on real engagement. No bots. No spam. Just quality content.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              {connected ? (
                <Link href="/dashboard" className="btn-primary flex items-center gap-2">
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <WalletMultiButton />
              )}
              <a 
                href="#how-it-works" 
                className="btn-secondary flex items-center gap-2"
              >
                How It Works
              </a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto">
              {[
                { label: 'SOL Paid Out', value: 156, suffix: '+' },
                { label: 'Creators', value: 2847 },
                { label: 'Posts Tracked', value: 12459 },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="stat-card text-center"
                >
                  <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
                    <AnimatedCounter value={stat.value} />
                    {stat.suffix}
                  </div>
                  <div className="text-sm text-muted">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative py-24 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-muted text-lg">Three simple steps to start earning</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Wallet,
                step: '01',
                title: 'Connect & Verify',
                description: 'Connect your Solana wallet and link your X (Twitter) account to get started.',
              },
              {
                icon: Twitter,
                step: '02',
                title: 'Post Quality Content',
                description: `Create engaging posts about ${CASHTAG} or include the contract address.`,
              },
              {
                icon: DollarSign,
                step: '03',
                title: 'Earn SOL',
                description: 'Get rewarded daily based on your content\'s real engagement metrics.',
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative p-8 rounded-2xl bg-surface border border-border card-hover group"
              >
                <div className="absolute -top-4 -left-4 w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
                  <span className="text-primary font-bold">{item.step}</span>
                </div>
                <div className="w-14 h-14 rounded-xl bg-surface-light flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  <item.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                <p className="text-muted">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Scoring Section */}
      <section className="relative py-24 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                Transparent Scoring
              </h2>
              <p className="text-muted text-lg mb-8">
                Your rewards are calculated using a transparent formula that weights engagement quality over quantity.
              </p>
              
              <div className="p-6 rounded-xl bg-surface border border-border mb-6">
                <code className="text-primary text-lg">
                  Score = Engagement × Trust × Quality
                </code>
              </div>

              <div className="space-y-4">
                {[
                  { label: 'Engagement', desc: 'Likes, reposts, replies, quotes weighted by value' },
                  { label: 'Trust', desc: 'Account age, followers, history factor' },
                  { label: 'Quality', desc: 'Content length, originality, media bonus' },
                ].map(item => (
                  <div key={item.label} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-white">{item.label}:</span>
                      <span className="text-muted ml-2">{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="p-8 rounded-2xl bg-surface border border-border"
            >
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Engagement Weights
              </h3>
              
              <div className="space-y-4">
                {[
                  { label: 'Like', weight: '×1.0', color: 'bg-blue-500' },
                  { label: 'Reply', weight: '×2.0', color: 'bg-green-500' },
                  { label: 'Repost', weight: '×3.0', color: 'bg-purple-500' },
                  { label: 'Quote', weight: '×4.0', color: 'bg-primary' },
                ].map((item, i) => (
                  <div key={item.label} className="flex items-center gap-4">
                    <span className="w-20 text-muted">{item.label}</span>
                    <div className="flex-1 h-3 bg-surface-light rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${(i + 1) * 25}%` }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1, duration: 0.5 }}
                        className={`h-full ${item.color} rounded-full`}
                      />
                    </div>
                    <span className="w-12 text-right font-mono text-primary">{item.weight}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-border">
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Shield className="w-4 h-4" />
                  <span>Anti-gaming protection: spam and bots get penalized</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Live Activity */}
      <section className="relative py-24 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="p-8 rounded-2xl bg-surface border border-border"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary live-pulse" />
                  Recent Rewards
                </h3>
                <Link href="/leaderboard" className="text-sm text-primary hover:underline">
                  View All
                </Link>
              </div>
              
              <div className="space-y-1">
                {recentActivity.map((item, i) => (
                  <ActivityItem key={i} {...item} />
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex flex-col justify-center"
            >
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                Join the Attention Economy
              </h2>
              <p className="text-muted text-lg mb-8">
                Real creators earning real rewards. No gatekeeping. Connect your wallet and start today.
              </p>
              
              {/* Contract Address */}
              <div className="p-4 rounded-xl bg-surface border border-border">
                <div className="text-sm text-muted mb-2">Contract Address</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-white font-mono text-sm truncate">
                    {CONTRACT_ADDRESS}
                  </code>
                  <button
                    onClick={copyCA}
                    className="p-2 rounded-lg bg-surface-light hover:bg-border transition-colors"
                    title="Copy"
                  >
                    <Copy className="w-4 h-4 text-muted" />
                  </button>
                  <a
                    href={`https://solscan.io/token/${CONTRACT_ADDRESS}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-surface-light hover:bg-border transition-colors"
                    title="View on Solscan"
                  >
                    <ExternalLink className="w-4 h-4 text-muted" />
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 px-4 border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              Ready to Earn?
            </h2>
            <p className="text-muted text-lg mb-10">
              Connect your wallet, link your X account, and start submitting your best content.
            </p>
            
            {connected ? (
              <Link href="/dashboard" className="btn-primary inline-flex items-center gap-2">
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <WalletMultiButton />
            )}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              <span className="font-bold">ATTENTION COIN</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted">
              <span>{CASHTAG}</span>
              <span>•</span>
              <span>{truncateWallet(CONTRACT_ADDRESS, 6)}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
