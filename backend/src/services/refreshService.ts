import { ParticipantModel, DepositModel, SnapshotModel, LeaderboardModel } from '../db/models';
import { ChainService, retryWithBackoff } from './chainService';
import { PolymarketService, estimatePortfolioFromDeposits } from './polymarketService';

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '25', 10);
const TOURNAMENT_START_DATE = new Date('2025-12-05');

/**
 * Main leaderboard refresh logic
 */
export async function refreshLeaderboard(): Promise<void> {
  const startTime = Date.now();
  console.log('🔄 Starting leaderboard refresh...');

  try {
    // Initialize services
    const chainService = new ChainService(
      process.env.RPC_URL!,
      process.env.USDC_TOKEN_ADDRESS!
    );

    const polymarketService = new PolymarketService(
      process.env.POLYMARKET_API_KEY
    );

    // Fetch all participants
    const participants = await ParticipantModel.findAll();
    console.log(`📊 Processing ${participants.length} participants`);

    if (participants.length === 0) {
      console.log('⚠️  No participants found. Use /admin/participants to seed data.');
      return;
    }

    // Process participants in batches
    const batches = chunkArray(participants, BATCH_SIZE);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`\n📦 Processing batch ${i + 1}/${batches.length} (${batch.length} participants)`);

      await processBatch(batch, chainService, polymarketService);

      // Delay between batches to avoid rate limiting
      if (i < batches.length - 1) {
        const delay = 2000; // 2 seconds between batches
        console.log(`⏳ Waiting ${delay}ms before next batch...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ Leaderboard refresh completed in ${duration}s`);
  } catch (error) {
    console.error('❌ Leaderboard refresh failed:', error);
    throw error;
  }
}

/**
 * Process a batch of participants
 */
async function processBatch(
  participants: any[],
  chainService: ChainService,
  polymarketService: PolymarketService
): Promise<void> {
  for (const participant of participants) {
    try {
      await processParticipant(participant, chainService, polymarketService);
    } catch (error) {
      console.error(`❌ Error processing participant ${participant.nickname}:`, error);
      // Continue with other participants even if one fails
    }
  }
}

/**
 * Process a single participant
 */
async function processParticipant(
  participant: any,
  chainService: ChainService,
  polymarketService: PolymarketService
): Promise<void> {
  console.log(`\n👤 Processing: ${participant.nickname} (${participant.wallet})`);

  // Step 1: Fetch and store deposits from chain
  const startBlock = parseInt(process.env.START_BLOCK || '0', 10);
  const deposits = await retryWithBackoff(async () => {
    const transfers = await chainService.fetchDepositsWithTimestamps(participant.wallet, startBlock);
    return transfers.map((t) =>
      chainService.transferToDeposit(t, participant.id, participant.wallet)
    );
  });

  console.log(`  💰 Found ${deposits.length} deposits`);

  if (deposits.length > 0) {
    await DepositModel.bulkCreate(deposits);
  }

  // Step 2: Calculate deposit sum
  const depositSum = await DepositModel.sumByParticipant(participant.id);
  console.log(`  📊 Total deposits: $${depositSum.toFixed(2)}`);

  // Step 3: Fetch portfolio value from Polymarket
  let portfolioValue = 0;
  let firstTradeDate: Date | null = null;

  try {
    const portfolio = await retryWithBackoff(
      () => polymarketService.fetchPortfolioValue(participant.wallet),
      2 // fewer retries for API calls
    );

    portfolioValue = portfolio.totalValue;
    console.log(`  💼 Portfolio value: $${portfolioValue.toFixed(2)}`);

    // Fetch first trade date for "old account" detection
    firstTradeDate = await polymarketService.getFirstTradeDate(participant.wallet);
    if (firstTradeDate) {
      console.log(`  📅 First trade: ${firstTradeDate.toISOString()}`);
    }
  } catch (error) {
    console.warn(`  ⚠️  Could not fetch portfolio from API, using fallback`);
    portfolioValue = estimatePortfolioFromDeposits(depositSum);
  }

  // Step 4: Calculate PnL
  const pnl = portfolioValue - depositSum;
  console.log(`  📈 PnL: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`);

  // Step 5: Determine flags
  const isLowDep = depositSum < 90;
  const isHighDep = depositSum > 110;
  const isOld = firstTradeDate ? firstTradeDate < TOURNAMENT_START_DATE : false;

  console.log(
    `  🏷️  Flags: ${isLowDep ? 'LOW_DEP ' : ''}${isHighDep ? 'HIGH_DEP ' : ''}${isOld ? 'OLD ' : ''}`
  );

  // Step 6: Create snapshot
  await SnapshotModel.create({
    participant_id: participant.id,
    portfolio_value: portfolioValue,
    deposit_sum: depositSum,
    pnl,
    is_low_dep: isLowDep,
    is_high_dep: isHighDep,
    is_old: isOld,
    first_trade_date: firstTradeDate,
    snapshot_time: new Date(),
  });

  // Step 7: Update leaderboard cache
  await LeaderboardModel.upsert({
    participant_id: participant.id,
    entry_order: participant.entry_order,
    nickname: participant.nickname,
    wallet: participant.wallet,
    portfolio_value: portfolioValue,
    deposit_sum: depositSum,
    pnl,
    is_low_dep: isLowDep,
    is_high_dep: isHighDep,
    is_old: isOld,
  });

  console.log(`  ✅ Updated leaderboard cache`);
}

/**
 * Utility: Split array into chunks
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
