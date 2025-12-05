# Quick Start Guide

Get the Polymarket Tournament Leaderboard running in 5 minutes.

## Prerequisites

- Node.js 18+
- PostgreSQL database (local or Supabase)
- Alchemy/Infura account for RPC access

## Steps

### 1. Install Dependencies

```bash
npm run install:all
```

### 2. Setup Environment

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your credentials
```

**Required .env values**:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/polymarket_leaderboard
RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_API_KEY
USDC_TOKEN_ADDRESS=0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174
ADMIN_KEY=my_secure_random_key_123
```

### 3. Run Migrations

```bash
npm run migrate
```

### 4. Seed Sample Data

Create a file `sample-participants.json`:

```json
{
  "participants": [
    {
      "entry_order": 1,
      "nickname": "CryptoTrader1",
      "wallet": "0x1234567890123456789012345678901234567890"
    },
    {
      "entry_order": 2,
      "nickname": "PolyWhale",
      "wallet": "0x0987654321098765432109876543210987654321"
    }
  ]
}
```

Seed via API:

```bash
curl -X POST http://localhost:4000/api/admin/participants \
  -H "Content-Type: application/json" \
  -H "x-admin-key: my_secure_random_key_123" \
  -d @sample-participants.json
```

### 5. Run Development Servers

**Terminal 1** - Backend:
```bash
npm run dev:backend
```

**Terminal 2** - Frontend:
```bash
npm run dev:frontend
```

### 6. Access the App

Open browser: `http://localhost:3000`

### 7. Trigger First Refresh

```bash
# Option 1: Via script
npm run refresh

# Option 2: Via API
curl -X POST http://localhost:4000/api/admin/refresh \
  -H "x-admin-key: my_secure_random_key_123"
```

## Next Steps

- Review the full [README.md](./README.md) for deployment instructions
- Configure cron schedule in `.env` (`UPDATE_CRON`)
- Set up production database (Supabase recommended)
- Deploy to Vercel

## Common Issues

**Database connection fails**:
```bash
# Test connection
psql $DATABASE_URL
```

**RPC errors**:
- Verify `RPC_URL` is for Polygon Mainnet
- Check API key is valid
- Ensure you have free credits/quota

**No data showing**:
- Verify participants were seeded
- Run manual refresh
- Check backend logs for errors

## Useful Commands

```bash
# Install all dependencies
npm run install:all

# Run migrations
npm run migrate

# Start backend dev server
npm run dev:backend

# Start frontend dev server
npm run dev:frontend

# Run manual refresh
npm run refresh

# Run tests
npm test

# Build for production
npm run build:backend
npm run build:frontend
```

---

**Need help?** Check the [README.md](./README.md) troubleshooting section.
