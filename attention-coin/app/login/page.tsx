'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Twitter, RefreshCw, ArrowRight, UserPlus, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '@/components/WalletProvider';
import { CASHTAG } from '@/lib/utils';

type Mode = 'login' | 'register';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, loading: userLoading } = useUser();
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<'input' | 'verify'>('input');

  // Redirect if already authenticated
  useEffect(() => {
    if (!userLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, userLoading, router]);

  // Login existing user
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error('Please enter your X username');
      return;
    }

    setLoading(true);
    try {
      const cleanUsername = username.replace('@', '').trim();
      const success = await login(cleanUsername);

      if (success) {
        toast.success('Welcome back!');
        router.push('/dashboard');
      } else {
        toast.error('Account not found or not verified. Please register first.');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Generate verification code for new user
  const handleGenerateCode = async () => {
    if (!username.trim()) {
      toast.error('Please enter your X username');
      return;
    }

    setLoading(true);
    try {
      const cleanUsername = username.replace('@', '').trim();

      const response = await fetch('/api/verify-x', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate code');
      }

      setVerificationCode(result.data.code);
      setStep('verify');
      toast.success('Verification code generated!');
    } catch (error) {
      console.error('Generate code error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate code');
    } finally {
      setLoading(false);
    }
  };

  // Verify the user's account
  const handleVerify = async () => {
    if (!username.trim()) {
      toast.error('Please enter your X username');
      return;
    }

    setLoading(true);
    try {
      const cleanUsername = username.replace('@', '').trim();

      const response = await fetch('/api/verify-x', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to verify');
      }

      toast.success('X account verified!');

      // Now log the user in
      const loginSuccess = await login(cleanUsername);
      if (loginSuccess) {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Verification error:', error);
      toast.error(error instanceof Error ? error.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const tweetText = `Verifying my account for @AttentionCoin

Code: ${verificationCode}

${CASHTAG}`;

  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-6">
            <Twitter className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-3">
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-muted">
            {mode === 'login'
              ? 'Enter your X username to continue'
              : 'Verify your X account to get started'}
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2 p-1 bg-surface border border-border rounded-xl mb-8">
          <button
            onClick={() => {
              setMode('login');
              setStep('input');
              setVerificationCode('');
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-all ${
              mode === 'login'
                ? 'bg-primary text-black'
                : 'text-muted hover:text-white'
            }`}
          >
            <LogIn className="w-4 h-4" />
            Login
          </button>
          <button
            onClick={() => {
              setMode('register');
              setStep('input');
              setVerificationCode('');
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-all ${
              mode === 'register'
                ? 'bg-primary text-black'
                : 'text-muted hover:text-white'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Register
          </button>
        </div>

        {/* Login Mode */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-muted mb-2">X Username</label>
              <input
                type="text"
                placeholder="@username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-dark w-full"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading || !username.trim()}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Register Mode */}
        {mode === 'register' && (
          <div className="space-y-6">
            {step === 'input' && (
              <>
                <div>
                  <label className="block text-sm text-muted mb-2">X Username</label>
                  <input
                    type="text"
                    placeholder="@username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="input-dark w-full"
                    autoFocus
                  />
                </div>

                <button
                  onClick={handleGenerateCode}
                  disabled={loading || !username.trim()}
                  className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Generate Verification Code
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </>
            )}

            {step === 'verify' && (
              <>
                {/* Step 1: Post Tweet */}
                <div className="p-4 rounded-xl bg-surface border border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-sm font-bold flex items-center justify-center">
                      1
                    </span>
                    <span className="font-medium">Post this tweet</span>
                  </div>
                  <div className="p-3 rounded-lg bg-background border border-border mb-4">
                    <p className="text-sm text-muted whitespace-pre-wrap">{tweetText}</p>
                  </div>
                  <a
                    href={tweetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary w-full flex items-center justify-center gap-2"
                  >
                    <Twitter className="w-4 h-4" />
                    Post Tweet
                  </a>
                </div>

                {/* Step 2: Verify */}
                <div className="p-4 rounded-xl bg-surface border border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-sm font-bold flex items-center justify-center">
                      2
                    </span>
                    <span className="font-medium">Complete verification</span>
                  </div>
                  <p className="text-sm text-muted mb-4">
                    After posting the tweet, click below to verify your account.
                  </p>
                  <button
                    onClick={handleVerify}
                    disabled={loading}
                    className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Verify & Continue
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>

                <button
                  onClick={() => {
                    setStep('input');
                    setVerificationCode('');
                  }}
                  className="text-sm text-muted hover:text-white w-full text-center"
                >
                  &larr; Start over
                </button>

                <p className="text-xs text-muted text-center">
                  Keep the tweet posted for at least 24 hours
                </p>
              </>
            )}
          </div>
        )}

        {/* Footer */}
        <p className="text-xs text-muted text-center mt-8">
          By continuing, you agree to our terms and conditions.
        </p>
      </div>
    </div>
  );
}
