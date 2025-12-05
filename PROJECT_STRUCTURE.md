# Project Structure

Complete directory tree and file descriptions for the Polymarket Tournament Leaderboard.

## Directory Tree

```
polymarket-leaderboard/
│
├── backend/                                 # Backend API server
│   ├── src/
│   │   ├── db/
│   │   │   ├── connection.ts                # PostgreSQL connection pool
│   │   │   └── models.ts                    # Database models & queries
│   │   │
│   │   ├── routes/
│   │   │   ├── leaderboard.ts               # GET /api/leaderboard endpoint
│   │   │   ├── admin.ts                     # Admin endpoints (seed, refresh, status)
│   │   │   └── __tests__/
│   │   │       └── leaderboard.test.ts      # API response format tests
│   │   │
│   │   ├── services/
│   │   │   ├── chainService.ts              # Blockchain data fetcher (ERC-20 events)
│   │   │   ├── polymarketService.ts         # Polymarket API integration
│   │   │   ├── refreshService.ts            # Main refresh orchestration
│   │   │   └── __tests__/
│   │   │       └── chainService.test.ts     # Deposit parsing & PnL tests
│   │   │
│   │   └── index.ts                         # Express app + cron scheduler
│   │
│   ├── migrations/
│   │   ├── 001_initial_schema.sql           # Database tables schema
│   │   └── run.ts                           # Migration runner script
│   │
│   ├── package.json                         # Backend dependencies
│   ├── tsconfig.json                        # TypeScript configuration
│   ├── jest.config.js                       # Jest test configuration
│   ├── vercel.json                          # Vercel deployment config
│   ├── .env.example                         # Environment variables template
│   └── .eslintrc.json                       # ESLint configuration
│
├── frontend/                                # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   └── Leaderboard.tsx              # Main leaderboard component
│   │   │
│   │   ├── services/
│   │   │   └── api.ts                       # API client (axios)
│   │   │
│   │   ├── types.ts                         # TypeScript interfaces
│   │   ├── config.ts                        # App config & utilities
│   │   ├── App.tsx                          # Root component
│   │   ├── main.tsx                         # React entry point
│   │   └── vite-env.d.ts                    # Vite type definitions
│   │
│   ├── public/                              # Static assets
│   ├── index.html                           # HTML template
│   ├── package.json                         # Frontend dependencies
│   ├── tsconfig.json                        # TypeScript configuration
│   ├── tsconfig.node.json                   # TypeScript config for Vite
│   ├── vite.config.ts                       # Vite bundler config
│   ├── .env.example                         # Environment variables template
│   └── .eslintrc.cjs                        # ESLint configuration
│
├── scripts/
│   └── refresh_leaderboard.ts               # Manual refresh CLI script
│
├── package.json                             # Root package.json (workspaces)
├── .gitignore                               # Git ignore rules
├── README.md                                # Complete documentation
├── QUICKSTART.md                            # 5-minute setup guide
├── PROJECT_STRUCTURE.md                     # This file
└── sample-participants.json                 # Sample seed data
```

## File Descriptions

### Backend Files

#### Core Application
- **`src/index.ts`**: Main Express server with CORS, routes, cron scheduler, and error handling
- **`src/db/connection.ts`**: PostgreSQL connection pool using `pg` with query helper
- **`src/db/models.ts`**: Database models for participants, deposits, snapshots, and leaderboard cache

#### API Routes
- **`src/routes/leaderboard.ts`**: Public endpoint to fetch leaderboard with sorting
- **`src/routes/admin.ts`**: Admin-only endpoints for seeding participants and triggering refreshes

#### Services
- **`src/services/chainService.ts`**:
  - Fetches ERC-20 Transfer events from blockchain
  - Parses deposit transactions
  - Handles RPC retries with exponential backoff

- **`src/services/polymarketService.ts`**:
  - Integrates with Polymarket API
  - Fetches portfolio values
  - Determines first trade date
  - Fallback to deposit-based estimation

- **`src/services/refreshService.ts`**:
  - Orchestrates full leaderboard refresh
  - Batch processing with rate limiting
  - Calculates PnL and flags (low/high deposit, old account)
  - Updates snapshots and cache

#### Database
- **`migrations/001_initial_schema.sql`**: Creates all tables with indexes and triggers
- **`migrations/run.ts`**: Migration runner with transaction support

#### Tests
- **`src/services/__tests__/chainService.test.ts`**: Tests for deposit parsing and PnL logic
- **`src/routes/__tests__/leaderboard.test.ts`**: Tests for API response format

### Frontend Files

#### Components
- **`src/components/Leaderboard.tsx`**:
  - Main UI component with table
  - Sort toggle (entry order vs PnL)
  - Color-coded PnL display
  - Badges for flags
  - Links to Polymarket profiles

#### Services & Config
- **`src/services/api.ts`**: Axios client for backend API
- **`src/config.ts`**: Configuration constants and utility functions
- **`src/types.ts`**: TypeScript interfaces for leaderboard data

#### Entry Points
- **`src/main.tsx`**: React app initialization with MUI theme
- **`src/App.tsx`**: Root component wrapper
- **`index.html`**: HTML template

### Configuration Files

#### Backend
- **`package.json`**: Dependencies (express, pg, ethers, axios, node-cron)
- **`tsconfig.json`**: TypeScript compiler options
- **`jest.config.js`**: Jest test configuration
- **`vercel.json`**: Vercel serverless deployment config
- **`.env.example`**: Environment variable template

#### Frontend
- **`package.json`**: Dependencies (react, mui, axios)
- **`tsconfig.json`**: TypeScript compiler options for React
- **`vite.config.ts`**: Vite dev server and build config
- **`.env.example`**: Environment variable template

#### Root
- **`package.json`**: Workspace configuration and convenience scripts
- **`.gitignore`**: Ignore node_modules, .env, dist, etc.

### Documentation
- **`README.md`**: Complete project documentation with setup, deployment, and API docs
- **`QUICKSTART.md`**: 5-minute quick start guide
- **`PROJECT_STRUCTURE.md`**: This file - complete project structure reference

### Data
- **`sample-participants.json`**: Sample participant data for testing

## Database Schema

### Tables

1. **`participants`**
   - Stores tournament participants
   - Fields: id, entry_order, nickname, wallet, timestamps

2. **`deposits`**
   - Stores on-chain USDC deposits
   - Fields: id, participant_id, wallet, tx_hash, block_number, amount, timestamp

3. **`snapshots`**
   - Historical portfolio snapshots
   - Fields: id, participant_id, portfolio_value, deposit_sum, pnl, flags, snapshot_time

4. **`leaderboard_cache`**
   - Current leaderboard state (materialized view)
   - Fields: participant_id, entry_order, nickname, wallet, portfolio_value, deposit_sum, pnl, flags

5. **`migrations`**
   - Tracks executed migrations
   - Auto-created by migration runner

### Indexes
- Wallets, entry_order, PnL, participant_id, block_number
- Optimized for fast lookups and sorting

## API Endpoints

### Public
- `GET /api/leaderboard?sortBy=pnl|entry_order` - Get leaderboard data
- `GET /health` - Health check

### Admin (requires x-admin-key header)
- `POST /api/admin/participants` - Seed participants
- `POST /api/admin/refresh` - Trigger manual refresh
- `GET /api/admin/status` - Get system status

## Environment Variables

### Backend
- **Required**: `DATABASE_URL`, `RPC_URL`, `USDC_TOKEN_ADDRESS`, `ADMIN_KEY`
- **Optional**: `POLYMARKET_API_KEY`, `UPDATE_CRON`, `BATCH_SIZE`, `PORT`, `LOG_QUERIES`

### Frontend
- **Optional**: `VITE_API_URL` (defaults to `/api` for proxy)

## Scripts

### Root Level
- `npm run install:all` - Install all dependencies
- `npm run dev:backend` - Start backend dev server
- `npm run dev:frontend` - Start frontend dev server
- `npm run build:backend` - Build backend for production
- `npm run build:frontend` - Build frontend for production
- `npm run migrate` - Run database migrations
- `npm run refresh` - Trigger manual leaderboard refresh
- `npm test` - Run backend tests

### Backend
- `npm run dev` - Start with tsx watch mode
- `npm run build` - Compile TypeScript to dist/
- `npm start` - Run compiled JavaScript
- `npm test` - Run Jest tests
- `npm run migrate` - Run migrations
- `npm run refresh` - Manual refresh

### Frontend
- `npm run dev` - Start Vite dev server (port 3000)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL with `pg` driver
- **Blockchain**: ethers.js v6
- **HTTP Client**: Axios
- **Scheduler**: node-cron
- **Testing**: Jest + ts-jest

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **UI Library**: Material-UI (MUI)
- **HTTP Client**: Axios
- **Styling**: Emotion (via MUI)

### Infrastructure
- **Hosting**: Vercel (recommended)
- **Database**: Supabase PostgreSQL (recommended)
- **RPC Provider**: Alchemy or Infura
- **Network**: Polygon Mainnet

## Key Features Implemented

✅ Full TypeScript coverage
✅ PostgreSQL with migrations
✅ On-chain deposit tracking (ERC-20 events)
✅ Polymarket API integration with fallback
✅ Automated refresh with cron scheduling
✅ Admin API with authentication
✅ Responsive MUI-based UI
✅ PnL calculation and ranking
✅ Flags for deposit amounts and account age
✅ Batch processing with rate limiting
✅ Retry logic with exponential backoff
✅ Comprehensive tests
✅ Production-ready deployment config
✅ Complete documentation

## Next Steps

1. Install dependencies: `npm run install:all`
2. Configure `.env` files
3. Run migrations: `npm run migrate`
4. Seed participants
5. Start dev servers
6. Trigger first refresh
7. Deploy to Vercel + Supabase

See [QUICKSTART.md](./QUICKSTART.md) for detailed setup instructions.
