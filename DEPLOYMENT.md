# Deployment Checklist

Step-by-step guide to deploy the Polymarket Tournament Leaderboard to production.

## Prerequisites Checklist

- [ ] Node.js 18+ installed
- [ ] Vercel account created ([vercel.com](https://vercel.com))
- [ ] Supabase account created ([supabase.com](https://supabase.com))
- [ ] Alchemy or Infura account with Polygon Mainnet access
- [ ] Git repository initialized

## Part 1: Database Setup (Supabase)

### 1.1 Create Supabase Project

1. Go to [app.supabase.com](https://app.supabase.com)
2. Click "New Project"
3. Fill in:
   - **Name**: `polymarket-leaderboard`
   - **Database Password**: Generate a strong password
   - **Region**: Choose closest to your users
4. Click "Create new project"

### 1.2 Get Connection String

1. Go to Project Settings > Database
2. Scroll to "Connection string"
3. Select "URI" tab
4. Copy the connection string (replace `[YOUR-PASSWORD]` with your actual password)
5. Save as `DATABASE_URL` for later

Example:
```
postgresql://postgres:[YOUR-PASSWORD]@db.abcdefghijklmnop.supabase.co:5432/postgres
```

### 1.3 Run Migrations

```bash
# Set environment variable temporarily
export DATABASE_URL="postgresql://postgres:your_password@db.xxx.supabase.co:5432/postgres"

# Or on Windows
set DATABASE_URL=postgresql://postgres:your_password@db.xxx.supabase.co:5432/postgres

# Run migrations
cd backend
npm run migrate
```

Verify tables were created:
```bash
# Using Supabase SQL Editor or psql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

## Part 2: Backend Deployment (Vercel)

### 2.1 Prepare Backend

```bash
cd backend

# Test build
npm run build

# Verify vercel.json exists
ls vercel.json
```

### 2.2 Install Vercel CLI

```bash
npm install -g vercel
```

### 2.3 Deploy Backend

```bash
# Login to Vercel
vercel login

# Deploy
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? polymarket-leaderboard-api
# - Directory? ./
# - Override settings? No
```

### 2.4 Set Environment Variables

Go to Vercel Dashboard > Your Project > Settings > Environment Variables

Add the following:

| Variable | Value | Example |
|----------|-------|---------|
| `DATABASE_URL` | Supabase connection string | `postgresql://postgres:...` |
| `RPC_URL` | Alchemy/Infura Polygon URL | `https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY` |
| `USDC_TOKEN_ADDRESS` | Polygon USDC address | `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174` |
| `ADMIN_KEY` | Strong random string | `use-openssl-rand-hex-32` |
| `UPDATE_CRON` | Cron expression | `0 */12 * * *` |
| `BATCH_SIZE` | Batch size | `25` |
| `NODE_ENV` | Environment | `production` |
| `POLYMARKET_API_KEY` | (Optional) API key | `your_api_key` |

**Generate secure ADMIN_KEY**:
```bash
# Linux/Mac
openssl rand -hex 32

# Or Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2.5 Redeploy with Environment Variables

```bash
vercel --prod
```

### 2.6 Get Backend URL

After deployment, copy your production URL:
```
https://polymarket-leaderboard-api.vercel.app
```

## Part 3: Frontend Deployment (Vercel)

### 3.1 Configure Frontend Environment

```bash
cd ../frontend

# Create .env
echo "VITE_API_URL=https://your-backend.vercel.app/api" > .env
```

Replace `your-backend` with your actual backend URL from Part 2.6.

### 3.2 Test Build

```bash
npm run build
npm run preview
```

Visit preview URL and verify it works.

### 3.3 Deploy Frontend

```bash
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? polymarket-leaderboard
# - Directory? ./
# - Override settings? No
```

### 3.4 Set Environment Variable in Vercel

Go to Vercel Dashboard > Frontend Project > Settings > Environment Variables

Add:
- **Name**: `VITE_API_URL`
- **Value**: `https://your-backend.vercel.app/api`

### 3.5 Redeploy

```bash
vercel --prod
```

## Part 4: Initialize Data

### 4.1 Seed Participants

Using your deployed backend URL:

```bash
curl -X POST https://your-backend.vercel.app/api/admin/participants \
  -H "Content-Type: application/json" \
  -H "x-admin-key: YOUR_ADMIN_KEY" \
  -d @sample-participants.json
```

Or create a custom participants list:

```json
{
  "participants": [
    {
      "entry_order": 1,
      "nickname": "Alice",
      "wallet": "0x1234567890123456789012345678901234567890"
    }
  ]
}
```

### 4.2 Trigger Initial Refresh

```bash
curl -X POST https://your-backend.vercel.app/api/admin/refresh \
  -H "x-admin-key: YOUR_ADMIN_KEY"
```

This will:
1. Fetch on-chain deposits for all participants
2. Get portfolio values from Polymarket
3. Calculate PnL and flags
4. Update leaderboard cache

**Note**: This may take several minutes depending on participant count.

### 4.3 Verify Leaderboard

Visit your frontend URL:
```
https://your-frontend.vercel.app
```

You should see the leaderboard populated with data!

## Part 5: Post-Deployment

### 5.1 Set Up Custom Domain (Optional)

1. Go to Vercel Dashboard > Your Project > Settings > Domains
2. Add your custom domain
3. Configure DNS records as instructed

### 5.2 Monitor Cron Jobs

Vercel serverless functions have limitations:
- **Max execution time**: 10 seconds (Hobby), 60 seconds (Pro)
- **Cron jobs**: Not supported on Hobby plan

**For automatic scheduled refreshes**:

Option A: Upgrade to Vercel Pro
Option B: Use external cron service (e.g., cron-job.org, EasyCron)

```bash
# External cron hits your refresh endpoint every 12 hours
curl -X POST https://your-backend.vercel.app/api/admin/refresh \
  -H "x-admin-key: YOUR_ADMIN_KEY"
```

### 5.3 Set Up Monitoring

Add monitoring to track:
- API response times
- Error rates
- RPC provider quota usage
- Database connection pool

Recommended services:
- **Vercel Analytics**: Built-in analytics
- **Sentry**: Error tracking
- **LogTail**: Log aggregation

### 5.4 Security Hardening

- [ ] Rotate `ADMIN_KEY` periodically
- [ ] Enable CORS restrictions in production
- [ ] Add rate limiting to public endpoints
- [ ] Monitor for unusual activity
- [ ] Keep dependencies updated

```bash
# Check for vulnerabilities
npm audit

# Update dependencies
npm update
```

## Part 6: Ongoing Maintenance

### 6.1 Manual Refresh

Trigger refresh anytime:

```bash
curl -X POST https://your-backend.vercel.app/api/admin/refresh \
  -H "x-admin-key: YOUR_ADMIN_KEY"
```

### 6.2 Add New Participants

```bash
curl -X POST https://your-backend.vercel.app/api/admin/participants \
  -H "Content-Type: application/json" \
  -H "x-admin-key: YOUR_ADMIN_KEY" \
  -d '{
    "participants": [
      {
        "entry_order": 10,
        "nickname": "NewTrader",
        "wallet": "0xNEW_WALLET_ADDRESS"
      }
    ]
  }'
```

### 6.3 View Logs

Vercel Dashboard > Your Project > Deployments > [Latest] > View Function Logs

### 6.4 Database Backups

Supabase provides automatic backups:
- Project Settings > Database > Backups
- Enable Point-in-Time Recovery (PITR) for Pro plans

### 6.5 Cost Monitoring

**Vercel**:
- Monitor function invocations
- Check bandwidth usage
- Review build minutes

**Supabase**:
- Monitor database size
- Check connection count
- Review API requests

**RPC Provider** (Alchemy/Infura):
- Monitor compute units used
- Set up usage alerts
- Review rate limit hits

## Troubleshooting Deployment Issues

### Build Fails

```bash
# Locally test build
npm run build:backend
npm run build:frontend

# Check logs for specific errors
```

### Database Connection Fails

```bash
# Test connection string
psql "$DATABASE_URL"

# Verify SSL settings (Supabase requires SSL)
# If issues, add ?sslmode=require to DATABASE_URL
```

### CORS Errors

Update backend `src/index.ts`:

```typescript
app.use(cors({
  origin: [
    'https://your-frontend.vercel.app',
    'http://localhost:3000', // for local dev
  ],
}));
```

### Cron Not Running

Vercel Hobby plan doesn't support cron. Solutions:
1. Upgrade to Vercel Pro
2. Use external cron service
3. Manually trigger refreshes

### RPC Rate Limiting

- Reduce `BATCH_SIZE` in environment variables
- Upgrade RPC provider plan
- Add longer delays between batches

### Out of Memory

Vercel serverless functions have memory limits:
- Increase in vercel.json:

```json
{
  "functions": {
    "src/index.ts": {
      "memory": 1024
    }
  }
}
```

## Production Checklist

Before going live:

- [ ] Database migrations completed
- [ ] All environment variables set
- [ ] Participants seeded
- [ ] Initial refresh completed
- [ ] Frontend displays data correctly
- [ ] Admin endpoints secured
- [ ] Custom domain configured (optional)
- [ ] Monitoring set up
- [ ] Backups enabled
- [ ] Documentation updated with production URLs

## Support & Resources

- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Alchemy Docs**: https://docs.alchemy.com
- **Infura Docs**: https://docs.infura.io
- **Polymarket**: https://polymarket.com

---

**Deployment complete!** 🎉

Your Polymarket Tournament Leaderboard is now live and ready to track participant performance.
