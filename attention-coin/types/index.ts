// Database types
export interface User {
  id: string;
  wallet_address: string;
  x_username: string | null;
  x_user_id: string | null;
  x_display_name: string | null;
  x_followers: number;
  x_following: number;
  x_profile_image: string | null;
  x_verified_at: string | null;
  verification_code: string | null;
  verification_expires: string | null;
  trust_score: number;
  status: 'active' | 'suspended' | 'blacklisted';
  total_earned_lamports: number;
  total_submissions: number;
  created_at: string;
  updated_at: string;
}

export interface Submission {
  id: string;
  user_id: string;
  tweet_id: string;
  tweet_url: string;
  tweet_text: string | null;
  has_ca: boolean;
  has_cashtag: boolean;
  has_media: boolean;
  posted_at: string | null;
  likes: number;
  reposts: number;
  replies: number;
  quotes: number;
  views: number;
  base_score: number;
  trust_multiplier: number;
  quality_multiplier: number;
  final_score: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  rejection_reason: string | null;
  verified_at: string | null;
  approved_at: string | null;
  content_hash: string | null;
  created_at: string;
  // Joined data
  user?: User;
}

export interface Reward {
  id: string;
  user_id: string;
  period_date: string;
  total_score: number;
  amount_lamports: number;
  amount_sol: number;
  status: 'pending' | 'paid';
  tx_signature: string | null;
  created_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  wallet_address: string;
  x_username: string | null;
  total_score: number;
  total_earned: number;
  submission_count: number;
}

export interface Config {
  contract_address: string;
  cashtag: string;
  scoring_weights: {
    like: number;
    repost: number;
    reply: number;
    quote: number;
    view: number;
  };
  trust_requirements: {
    min_account_age_days: number;
    min_followers: number;
    min_follower_ratio: number;
  };
  anti_gaming: {
    max_submissions_per_day: number;
    min_minutes_between: number;
  };
  payout_settings: {
    daily_budget_sol: number;
    max_per_user_sol: number;
    min_payout_sol: number;
  };
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface UserStats {
  totalEarnedSol: number;
  totalSubmissions: number;
  approvedSubmissions: number;
  pendingSubmissions: number;
  rank: number | null;
  todaySubmissions: number;
}

// Supabase Database type
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Partial<User> & { wallet_address: string };
        Update: Partial<User>;
      };
      submissions: {
        Row: Submission;
        Insert: Partial<Submission> & { user_id: string; tweet_id: string; tweet_url: string };
        Update: Partial<Submission>;
      };
      rewards: {
        Row: Reward;
        Insert: Partial<Reward> & { user_id: string; period_date: string };
        Update: Partial<Reward>;
      };
      config: {
        Row: { key: string; value: any; updated_at: string };
        Insert: { key: string; value: any };
        Update: { value?: any };
      };
    };
  };
}
