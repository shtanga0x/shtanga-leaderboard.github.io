#!/usr/bin/env tsx
/**
 * Manual leaderboard refresh script
 *
 * Usage:
 *   npm run refresh
 *   or
 *   tsx scripts/refresh_leaderboard.ts
 */

import dotenv from 'dotenv';
import { refreshLeaderboard } from '../backend/src/services/refreshService';
import { closePool } from '../backend/src/db/connection';

dotenv.config();

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Polymarket Tournament Leaderboard - Manual Refresh');
  console.log('═══════════════════════════════════════════════════════\n');

  // Validate required environment variables
  const required = ['DATABASE_URL', 'RPC_URL', 'USDC_TOKEN_ADDRESS'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach((key) => console.error(`   - ${key}`));
    process.exit(1);
  }

  try {
    await refreshLeaderboard();
    console.log('\n✅ Refresh completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Refresh failed:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

main();
