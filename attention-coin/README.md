# ATTENTION COIN 🎯

A premium web app for your memecoin that rewards users for posting quality content on X (Twitter).

![ATTENTION COIN](https://img.shields.io/badge/Solana-Powered-00ff88?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge)

## Features

- 🔐 **Wallet Connection** - Phantom, Backpack, Solflare support
- 🐦 **X Account Linking** - Verify X accounts via tweet verification
- 📝 **Tweet Submissions** - Users submit their tweets for review
- 📊 **Scoring System** - Transparent engagement-based scoring
- 🏆 **Leaderboard** - Track top attention drivers
- 👨‍💼 **Admin Panel** - Review submissions, manage users, export payouts
- 💰 **Manual Payouts** - Export CSV for manual SOL distribution

## Quick Start (Deploy Today!)

### 1. Create Supabase Project (5 minutes)

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project (remember your database password)
3. Once created, go to **SQL Editor** in the sidebar
4. Click **New Query**
5. Copy the entire contents of `supabase-schema.sql` and paste it
6. Click **Run** - your database is now set up!

### 2. Get Supabase Keys

1. In Supabase, go to **Settings** > **API**
2. Copy these values:
   - `Project URL` → This is your `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → This is your `SUPABASE_SERVICE_ROLE_KEY`

### 3. Deploy to Vercel (5 minutes)

1. Push this code to a GitHub repository
2. Go to [vercel.com](https://vercel.com) and sign in with GitHub
3. Click **Add New Project** and import your repo
4. Add Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_CONTRACT_ADDRESS=your_solana_contract_address
NEXT_PUBLIC_CASHTAG=$ATTENTION
NEXT_PUBLIC_ADMIN_WALLET=your_wallet_address
```

5. Click **Deploy**

### 4. You're Live! 🚀

Your app is now deployed. Here's how it works:

1. **Users visit your site** → Connect wallet → Link X account
2. **Users post on X** → Include your cashtag or CA → Submit tweet URL
3. **You review in Admin panel** → Check tweet → Enter engagement numbers → Approve
4. **Daily payouts** → Export CSV → Send SOL manually to each wallet

## Local Development

```bash
# Install dependencies
npm install

# Copy env file and fill in your values
cp .env.example .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
attention-coin/
├── app/
│   ├── page.tsx           # Landing page
│   ├── dashboard/         # User dashboard
│   ├── leaderboard/       # Public leaderboard
│   ├── admin/             # Admin panel (your wallet only)
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/
│   ├── Header.tsx         # Navigation header
│   └── WalletProvider.tsx # Solana wallet context
├── lib/
│   ├── supabase.ts        # Database client
│   └── utils.ts           # Helper functions
├── types/
│   └── index.ts           # TypeScript types
└── supabase-schema.sql    # Database setup
```

## Admin Panel

Access the admin panel by connecting with your admin wallet (set in `NEXT_PUBLIC_ADMIN_WALLET`).

### Reviewing Submissions

1. Go to `/admin` while connected with admin wallet
2. See pending submissions
3. Click "View Tweet" to open on X and verify engagement
4. Enter the likes, reposts, replies counts
5. Click Approve or Reject

### Manual Payouts

1. Go to Admin > "Export & Pay" tab
2. Click "Download Payout CSV"
3. Open the CSV - it shows each wallet and their reward amount
4. Open Phantom/your wallet
5. Send SOL to each address
6. Click "Mark All as Paid" when done

## Scoring Formula

```
Base Score = (Likes × 1) + (Reposts × 3) + (Replies × 2) + (Quotes × 4)
Final Score = Base Score × Trust Multiplier × Quality Multiplier
```

Adjust weights in the `config` table in Supabase.

## Security Notes

- Admin wallet is checked client-side - add server-side checks for production
- Users can only see their own submissions
- RLS (Row Level Security) is enabled on all tables
- No private keys are stored - manual payouts for safety

## Customization

### Change Colors

Edit `tailwind.config.ts`:

```ts
colors: {
  primary: '#00ff88',     // Main accent color
  secondary: '#8b5cf6',   // Secondary color
  background: '#050505',  // Dark background
  // ... etc
}
```

### Change Scoring Weights

In Supabase SQL Editor:

```sql
UPDATE config 
SET value = '{"like": 1, "repost": 5, "reply": 3, "quote": 6}'::jsonb
WHERE key = 'scoring_weights';
```

### Change Daily Budget

In the admin panel export code, modify `dailyBudget`:

```ts
const dailyBudget = 10; // SOL per day
```

## Future Improvements

When you're ready to automate:

- [ ] Add Twitter API for automatic tweet verification
- [ ] Add Helius for automated SOL transfers  
- [ ] Add Vercel Cron for scheduled payouts
- [ ] Add engagement ring detection
- [ ] Add NFT-gated multipliers

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Wallet**: Solana Wallet Adapter
- **Animation**: Framer Motion
- **Icons**: Lucide React

## Support

Having issues? Check:

1. Supabase dashboard for database errors
2. Vercel deployment logs
3. Browser console for client errors

## License

MIT - Do whatever you want with it!

---

Built with 💚 for the attention economy.
