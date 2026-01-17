'use client'

import { useEffect, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { supabase } from '@/lib/supabase'
import { User, Submission } from '@/types'
import { ExternalLink, Check, X, Download, Users, FileText, DollarSign } from 'lucide-react'

export default function AdminPage() {
  const { publicKey } = useWallet()
  const [tab, setTab] = useState<'pending' | 'approved' | 'users' | 'export'>('pending')
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalUsers: 0, pendingSubmissions: 0, totalPaid: 0 })

  const isAdmin = publicKey?.toBase58() === process.env.NEXT_PUBLIC_ADMIN_WALLET

  useEffect(() => {
    if (isAdmin) {
      loadData()
    }
  }, [isAdmin, tab])

  async function loadData() {
    setLoading(true)
    
    if (tab === 'users') {
      const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false })
      setUsers(data || [])
    } else {
      const status = tab === 'pending' ? 'pending' : 'approved'
      const { data } = await supabase
        .from('submissions')
        .select('*, users(wallet_address, x_username)')
        .eq('status', status)
        .order('created_at', { ascending: false })
      setSubmissions(data || [])
    }

    // Load stats
    const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact', head: true })
    const { count: pendingSubmissions } = await supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending')
    const { data: usersData } = await supabase.from('users').select('total_earned_lamports')
    
    const totalPaid = (usersData as User[])?.reduce((sum, u) => sum + (u.total_earned_lamports || 0), 0) || 0

    setStats({
      totalUsers: totalUsers || 0,
      pendingSubmissions: pendingSubmissions || 0,
      totalPaid: totalPaid / 1e9 // Convert to SOL
    })

    setLoading(false)
  }

  async function handleApprove(submission: Submission, engagement: { likes: number, reposts: number, replies: number, quotes: number }) {
    const weights = { like: 1, repost: 3, reply: 2, quote: 4 }
    const baseScore = 
      engagement.likes * weights.like +
      engagement.reposts * weights.repost +
      engagement.replies * weights.reply +
      engagement.quotes * weights.quote

    await supabase
      .from('submissions')
      .update({
        status: 'approved',
        likes: engagement.likes,
        reposts: engagement.reposts,
        replies: engagement.replies,
        quotes: engagement.quotes,
        base_score: baseScore,
        final_score: baseScore,
        approved_at: new Date().toISOString()
      })
      .eq('id', submission.id)

    loadData()
  }

  async function handleReject(id: string, reason: string) {
    await supabase
      .from('submissions')
      .update({ status: 'rejected', rejection_reason: reason })
      .eq('id', id)
    loadData()
  }

  async function exportPayouts() {
    const { data: approvedSubmissions } = await supabase
      .from('submissions')
      .select('user_id, final_score, users(wallet_address)')
      .eq('status', 'approved')

    const userScores = new Map()
    
    approvedSubmissions?.forEach((sub: any) => {
      const wallet = sub.users?.wallet_address
      if (wallet) {
        userScores.set(wallet, (userScores.get(wallet) || 0) + sub.final_score)
      }
    })

    const totalScore = Array.from(userScores.values()).reduce((a: number, b: number) => a + b, 0)
    const dailyBudget = 10 // SOL

    let csv = 'Wallet Address,Score,SOL Amount\n'
    userScores.forEach((score, wallet) => {
      const amount = (score / totalScore) * dailyBudget
      csv += `${wallet},${score},${amount.toFixed(4)}\n`
    })

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payouts-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (!publicKey) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Admin Panel</h1>
          <p className="text-muted mb-6">Connect your wallet to access</p>
          <WalletMultiButton />
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-muted">This wallet is not authorized</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
          <WalletMultiButton />
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-surface border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-primary" />
              <span className="text-muted text-sm">Total Users</span>
            </div>
            <div className="text-3xl font-bold text-white">{stats.totalUsers}</div>
          </div>
          <div className="bg-surface border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-5 h-5 text-accent" />
              <span className="text-muted text-sm">Pending Reviews</span>
            </div>
            <div className="text-3xl font-bold text-white">{stats.pendingSubmissions}</div>
          </div>
          <div className="bg-surface border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-secondary" />
              <span className="text-muted text-sm">Total Paid</span>
            </div>
            <div className="text-3xl font-bold text-white">{stats.totalPaid.toFixed(2)} SOL</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          {(['pending', 'approved', 'users', 'export'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                tab === t
                  ? 'bg-primary text-background'
                  : 'bg-surface text-muted hover:text-white'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-muted">Loading...</div>
          </div>
        ) : tab === 'export' ? (
          <div className="bg-surface border border-border rounded-xl p-8 text-center">
            <h3 className="text-xl font-bold text-white mb-4">Export Payouts</h3>
            <p className="text-muted mb-6">Download CSV with wallet addresses and payout amounts</p>
            <button
              onClick={exportPayouts}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-dim text-background rounded-lg font-semibold transition-colors"
            >
              <Download className="w-5 h-5" />
              Download Payout CSV
            </button>
          </div>
        ) : tab === 'users' ? (
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="bg-surface border border-border rounded-xl p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-white font-medium mb-1">
                      {user.x_username ? `@${user.x_username}` : 'No X Account'}
                    </div>
                    <div className="text-sm text-muted font-mono">{user.wallet_address}</div>
                    <div className="text-sm text-muted mt-2">
                      Earned: {(user.total_earned_lamports / 1e9).toFixed(4)} SOL
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted">Trust: {(user.trust_score * 100).toFixed(0)}%</div>
                    <div className="text-sm text-muted">Submissions: {user.total_submissions}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((sub) => (
              <SubmissionCard
                key={sub.id}
                submission={sub}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SubmissionCard({
  submission,
  onApprove,
  onReject
}: {
  submission: any
  onApprove: (sub: Submission, engagement: any) => void
  onReject: (id: string, reason: string) => void
}) {
  const [engagement, setEngagement] = useState({ likes: 0, reposts: 0, replies: 0, quotes: 0 })

  return (
    <div className="bg-surface border border-border rounded-xl p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="text-white font-medium mb-1">
            @{submission.users?.x_username || 'Unknown'}
          </div>
          <div className="text-sm text-muted">{new Date(submission.created_at).toLocaleString()}</div>
        </div>
        <a
          href={submission.tweet_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:text-primary-dim transition-colors flex items-center gap-1"
        >
          <ExternalLink className="w-4 h-4" />
          View Tweet
        </a>
      </div>

      {submission.status === 'pending' && (
        <>
          <div className="grid grid-cols-4 gap-4 mb-4">
            {(['likes', 'reposts', 'replies', 'quotes'] as const).map((field) => (
              <div key={field}>
                <label className="text-sm text-muted block mb-1 capitalize">{field}</label>
                <input
                  type="number"
                  value={engagement[field]}
                  onChange={(e) => setEngagement({ ...engagement, [field]: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-white"
                />
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => onApprove(submission, engagement)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dim text-background rounded-lg font-medium transition-colors"
            >
              <Check className="w-4 h-4" />
              Approve
            </button>
            <button
              onClick={() => onReject(submission.id, 'Does not meet criteria')}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-accent/20 hover:bg-accent/30 text-accent rounded-lg font-medium transition-colors"
            >
              <X className="w-4 h-4" />
              Reject
            </button>
          </div>
        </>
      )}

      {submission.status === 'approved' && (
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-muted">Likes</div>
            <div className="text-white font-medium">{submission.likes}</div>
          </div>
          <div>
            <div className="text-muted">Reposts</div>
            <div className="text-white font-medium">{submission.reposts}</div>
          </div>
          <div>
            <div className="text-muted">Replies</div>
            <div className="text-white font-medium">{submission.replies}</div>
          </div>
          <div>
            <div className="text-muted">Score</div>
            <div className="text-primary font-medium">{submission.final_score}</div>
          </div>
        </div>
      )}
    </div>
  )
}