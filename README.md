# Polymarket Tournament Leaderboard

A full-stack application for tracking and displaying Polymarket tournament participant performance with real-time on-chain data and portfolio tracking.

## Features

- **Real-time Leaderboard**: Display participant rankings with PnL calculations
- **On-chain Data**: Fetch USDC deposits directly from blockchain via ERC-20 Transfer events
- **Portfolio Tracking**: Integration with Polymarket API for portfolio values
- **Automated Refresh**: Configurable cron-based scheduled updates
- **Admin Controls**: Seed participants and trigger manual refreshes
- **Rich UI**: Material-UI based frontend with sorting, badges, and profile links
- **Flags & Badges**: Automatic detection of low/high deposits and old accounts

## Tech Stack

### Frontend
- React 18
- TypeScript
- Vite
- Material-UI (MUI)
- Axios

### Backend
- Node.js
- Express
- TypeScript
- PostgreSQL
- ethers.js (v6)
- node-cron

## Project Structure

```
polymarket-leaderboard/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── connection.ts       # PostgreSQL connection
│   │   │   └── models.ts           # Database models
│   │   ├── routes/
│   │   │   ├── leaderboard.ts      # GET /api/leaderboard
│   │   │   └── admin.ts            # Admin endpoints
│   │   ├── services/
│   │   │   ├── chainService.ts     # Blockchain data fetcher
│   │   │   ├── polymarketService.ts # Polymarket API integration
│   │   │   └── refreshService.ts   # Main refresh logic
│   │   └── index.ts                # Express app & cron scheduler
│   ├── migrations/
│   │   ├── 001_initial_schema.sql  # Database schema
│   │   └── run.ts                  # Migration runner
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Leaderboard.tsx     # Main leaderboard component
│   │   ├── services/
│   │   │   └── api.ts              # API client
│   │   ├── types.ts                # TypeScript types
│   │   ├── config.ts               # App configuration
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
├── scripts/
│   └── refresh_leaderboard.ts      # Manual refresh script
└── README.md
```

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Ethereum RPC provider (Alchemy, Infura, etc.)
- (Optional) Polymarket API access

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Database Setup

#### Using Supabase (Recommended for Production)

1. Create a new project at [supabase.com](https://supabase.com)
2. Copy the connection string from Settings > Database
3. Use it as `DATABASE_URL` in your `.env`

#### Using Local PostgreSQL

```bash
# Create database
createdb polymarket_leaderboard

# Or using psql
psql -U postgres
CREATE DATABASE polymarket_leaderboard;
\q
```

### 3. Configure Environment Variables

#### Backend Configuration

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
# Required
DATABASE_URL=postgresql://user:password@localhost:5432/polymarket_leaderboard
RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_API_KEY
USDC_TOKEN_ADDRESS=0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174
ADMIN_KEY=your_secure_random_key

# Optional
POLYMARKET_API_KEY=
UPDATE_CRON=0 */12 * * *
BATCH_SIZE=25
PORT=4000
```

#### Frontend Configuration

```bash
cd frontend
cp .env.example .env
```

For local development, leave default:
```env
VITE_API_URL=/api
```

For production, set to your backend URL:
```env
VITE_API_URL=https://your-backend.vercel.app/api
```

### 4. Run Database Migrations

```bash
cd backend
npm run migrate
```

This creates tables: `participants`, `deposits`, `snapshots`, `leaderboard_cache`

### 5. Seed Initial Participants (Admin)

Use the admin API to seed participants:

```bash
curl -X POST http://localhost:4000/api/admin/participants \
  -H "Content-Type: application/json" \
  -H "x-admin-key: your_secure_random_key" \
  -d '{
    "participants": [
      {
        "entry_order": 1,
        "nickname": "Alice",
        "wallet": "0x1234567890123456789012345678901234567890"
      },
      {
        "entry_order": 2,
        "nickname": "Bob",
        "wallet": "0x0987654321098765432109876543210987654321"
      }
    ]
  }'
```

### 6. Development

Run backend and frontend concurrently:

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Access the app at: `http://localhost:3000`

### 7. Manual Refresh

Trigger a manual leaderboard refresh:

```bash
# Option 1: Via script
cd backend
npm run refresh

# Option 2: Via API
curl -X POST http://localhost:4000/api/admin/refresh \
  -H "x-admin-key: your_secure_random_key"
```

## Deployment

### Deploy to Vercel + Supabase

#### Backend Deployment

1. **Prepare for deployment**:
   - Ensure `backend/package.json` has `build` and `start` scripts
   - Create `vercel.json` in backend directory:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/index.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/index.ts"
    }
  ]
}
```

2. **Deploy backend**:
```bash
cd backend
vercel
```

3. **Set environment variables in Vercel Dashboard**:
   - `DATABASE_URL`
   - `RPC_URL`
   - `USDC_TOKEN_ADDRESS`
   - `ADMIN_KEY`
   - `POLYMARKET_API_KEY` (optional)
   - `UPDATE_CRON`

#### Frontend Deployment

1. **Update frontend .env** with backend URL:
```env
VITE_API_URL=https://your-backend.vercel.app/api
```

2. **Deploy frontend**:
```bash
cd frontend
vercel
```

## Blockchain Configuration Guide

### Selecting the Correct Network

Polymarket operates on **Polygon (Matic) Mainnet**. Ensure your RPC provider is configured for Polygon.

### USDC Token Addresses

| Network | USDC Address |
|---------|-------------|
| **Polygon Mainnet** | `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174` |
| Ethereum Mainnet | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` |

⚠️ **Important**: Use the Polygon address for Polymarket tournaments.

### RPC Provider Setup

#### Alchemy (Recommended)

1. Sign up at [alchemy.com](https://www.alchemy.com)
2. Create a new app for **Polygon Mainnet**
3. Copy the HTTPS URL:
```
https://polygon-mainnet.g.alchemy.com/v2/YOUR_API_KEY
```

#### Infura

1. Sign up at [infura.io](https://infura.io)
2. Create a new project
3. Select Polygon network
4. Copy the HTTPS endpoint:
```
https://polygon-mainnet.infura.io/v3/YOUR_PROJECT_ID
```

#### Alternative Providers

- **QuickNode**: [quicknode.com](https://www.quicknode.com)
- **Ankr**: [ankr.com](https://www.ankr.com)
- **Public RPC** (not recommended for production):
  - `https://polygon-rpc.com`
  - `https://rpc-mainnet.maticvigil.com`

### Switching Networks

To switch to a different network (e.g., for testing):

1. Update `RPC_URL` to the desired network's RPC endpoint
2. Update `USDC_TOKEN_ADDRESS` to the USDC contract on that network
3. Restart the backend server

## API Documentation

### Public Endpoints

#### GET /api/leaderboard

Get current leaderboard data.

**Query Parameters**:
- `sortBy`: `entry_order` (default) or `pnl`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "entry_order": 1,
      "nickname": "Alice",
      "wallet": "0x1234...",
      "portfolio_value": 150.00,
      "deposit_sum": 100.00,
      "pnl": 50.00,
      "is_low_dep": false,
      "is_high_dep": false,
      "is_old": false
    }
  ],
  "sortBy": "entry_order",
  "count": 1,
  "timestamp": "2025-12-05T10:00:00.000Z"
}
```

### Admin Endpoints

All admin endpoints require `x-admin-key` header.

#### POST /api/admin/participants

Seed participants.

**Headers**:
- `x-admin-key`: Your admin key

**Body**:
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

#### POST /api/admin/refresh

Trigger manual refresh (runs in background).

**Headers**:
- `x-admin-key`: Your admin key

#### GET /api/admin/status

Get system status.

**Headers**:
- `x-admin-key`: Your admin key

## Testing

```bash
cd backend
npm test
```

Tests cover:
- Deposit parsing from sample logs
- PnL calculation logic
- API response format validation
- USDC amount conversion
- Flag detection (low/high deposit, old accounts)

## Troubleshooting

### Database Connection Issues

```bash
# Test connection
psql $DATABASE_URL

# Check if migrations ran
psql $DATABASE_URL -c "\dt"
```

### RPC Rate Limiting

If you encounter rate limiting:
1. Reduce `BATCH_SIZE` (default: 25)
2. Increase delay between batches in `refreshService.ts`
3. Upgrade your RPC provider plan

### Polymarket API Errors

If portfolio fetching fails:
- The system falls back to estimating portfolio value from deposits
- Check if `POLYMARKET_API_KEY` is set correctly
- Verify API endpoints in `polymarketService.ts` match current API

### Cron Not Running

Verify cron expression:
```bash
# Test cron expression at: https://crontab.guru/
# Example: 0 */12 * * * = "Every 12 hours"
```

## Performance Considerations

- **Batch Size**: Adjust `BATCH_SIZE` based on RPC provider limits (default: 25)
- **Update Frequency**: Balance between freshness and API costs
- **Database Indexing**: Indexes are created on wallet, entry_order, and pnl columns
- **Caching**: Leaderboard results are cached in `leaderboard_cache` table

## Security Notes

1. **Admin Key**: Use a strong, random key for `ADMIN_KEY`
2. **Environment Variables**: Never commit `.env` files
3. **Rate Limiting**: Implement rate limiting for public endpoints in production
4. **Input Validation**: All wallet addresses are validated before database insertion

## License

MIT

## Support

For issues or questions:
1. Check [Troubleshooting](#troubleshooting) section
2. Review [API Documentation](#api-documentation)
3. Consult blockchain provider documentation for RPC issues

---

Built with ❤️ for the Polymarket community
