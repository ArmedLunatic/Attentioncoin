import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialization to avoid build-time errors when env vars aren't available
let _supabase: SupabaseClient | null = null;

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  }
  return url;
}

function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set');
  }
  return key;
}

// Client-side Supabase client (lazy initialization)
export const supabase = {
  get client(): SupabaseClient {
    if (!_supabase) {
      _supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey());
    }
    return _supabase;
  },
  from(table: string) {
    return this.client.from(table);
  },
  rpc(fn: string, params?: any) {
    return this.client.rpc(fn, params);
  },
  // Real-time subscription methods
  channel(name: string) {
    return this.client.channel(name);
  },
  removeChannel(channel: ReturnType<SupabaseClient['channel']>) {
    return this.client.removeChannel(channel);
  },
};

// Server-side client with service role (for API routes)
// Returns untyped client for flexibility in admin operations
export function createServerClient(): SupabaseClient {
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not set, falling back to anon key');
    return createClient(supabaseUrl, getSupabaseAnonKey());
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Helper to get user by wallet
export async function getUserByWallet(walletAddress: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('wallet_address', walletAddress)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching user:', error);
    return null;
  }

  return data;
}

// Helper to create or update user
export async function upsertUser(walletAddress: string, data: Record<string, any> = {}) {
  const { data: user, error } = await supabase
    .from('users')
    .upsert(
      { wallet_address: walletAddress, ...data },
      { onConflict: 'wallet_address' }
    )
    .select()
    .single();

  if (error) {
    console.error('Error upserting user:', error);
    return null;
  }

  return user;
}

// Helper to get submissions
export async function getSubmissions(options: {
  userId?: string;
  status?: string;
  limit?: number;
  offset?: number;
} = {}) {
  let query = supabase
    .from('submissions')
    .select('*, user:users(wallet_address, x_username, x_display_name, x_profile_image)')
    .order('created_at', { ascending: false });

  if (options.userId) {
    query = query.eq('user_id', options.userId);
  }
  if (options.status) {
    query = query.eq('status', options.status);
  }
  if (options.limit) {
    query = query.limit(options.limit);
  }
  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching submissions:', error);
    return [];
  }

  return data;
}

// Helper to get leaderboard
export async function getLeaderboard(period: 'day' | 'week' | 'month' | 'all' = 'all', limit = 50) {
  // Calculate date filter
  let dateFilter = new Date(0).toISOString(); // All time
  const now = new Date();
  
  if (period === 'day') {
    dateFilter = new Date(now.setDate(now.getDate() - 1)).toISOString();
  } else if (period === 'week') {
    dateFilter = new Date(now.setDate(now.getDate() - 7)).toISOString();
  } else if (period === 'month') {
    dateFilter = new Date(now.setMonth(now.getMonth() - 1)).toISOString();
  }

  const { data, error } = await supabase
    .from('submissions')
    .select(`
      user_id,
      final_score,
      users!inner(
        wallet_address,
        x_username,
        total_earned_lamports
      )
    `)
    .gte('created_at', dateFilter)
    .in('status', ['approved', 'paid']);

  if (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }

  // Aggregate by user
  const userScores: Record<string, {
    wallet_address: string;
    x_username: string | null;
    total_score: number;
    total_earned: number;
    submission_count: number;
  }> = {};

  data?.forEach((row: any) => {
    const userId = row.user_id;
    if (!userScores[userId]) {
      userScores[userId] = {
        wallet_address: row.users.wallet_address,
        x_username: row.users.x_username,
        total_score: 0,
        total_earned: row.users.total_earned_lamports / 1e9,
        submission_count: 0,
      };
    }
    userScores[userId].total_score += row.final_score || 0;
    userScores[userId].submission_count += 1;
  });

  // Sort and rank
  const leaderboard = Object.values(userScores)
    .sort((a, b) => b.total_score - a.total_score)
    .slice(0, limit)
    .map((entry, index) => ({
      rank: index + 1,
      ...entry,
    }));

  return leaderboard;
}
