import { ethers } from 'ethers';
import { Deposit } from '../db/models';

// ERC-20 Transfer event signature
const TRANSFER_EVENT_SIGNATURE = 'Transfer(address,address,uint256)';

export interface TransferEvent {
  txHash: string;
  blockNumber: number;
  from: string;
  to: string;
  amount: bigint;
  timestamp: number;
}

/**
 * Service for fetching on-chain deposit data
 */
export class ChainService {
  private provider: ethers.JsonRpcProvider;
  private usdcAddress: string;
  private usdcDecimals: number = 6; // USDC has 6 decimals

  constructor(rpcUrl: string, usdcAddress: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.usdcAddress = ethers.getAddress(usdcAddress);
  }

  /**
   * Fetch all USDC transfer events to a specific wallet address
   */
  async fetchDeposits(
    walletAddress: string,
    fromBlock: number = 0,
    toBlock: number | 'latest' = 'latest'
  ): Promise<TransferEvent[]> {
    const wallet = ethers.getAddress(walletAddress);

    try {
      // Create filter for Transfer events where 'to' is the participant's wallet
      const filter = {
        address: this.usdcAddress,
        topics: [
          ethers.id(TRANSFER_EVENT_SIGNATURE),
          null, // from (any address)
          ethers.zeroPadValue(wallet, 32), // to (participant wallet)
        ],
        fromBlock,
        toBlock,
      };

      console.log(`Fetching deposits for ${wallet} from block ${fromBlock} to ${toBlock}`);

      const logs = await this.provider.getLogs(filter);
      console.log(`Found ${logs.length} transfer events for ${wallet}`);

      // Parse events and fetch timestamps
      const transfers: TransferEvent[] = [];

      for (const log of logs) {
        const parsedLog = this.parseTransferLog(log);
        if (parsedLog) {
          transfers.push(parsedLog);
        }
      }

      return transfers;
    } catch (error) {
      console.error(`Error fetching deposits for ${wallet}:`, error);
      throw error;
    }
  }

  /**
   * Parse a Transfer event log
   */
  private parseTransferLog(log: ethers.Log): TransferEvent | null {
    try {
      const iface = new ethers.Interface([
        'event Transfer(address indexed from, address indexed to, uint256 value)',
      ]);

      const parsed = iface.parseLog({
        topics: log.topics as string[],
        data: log.data,
      });

      if (!parsed) return null;

      return {
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
        from: parsed.args.from,
        to: parsed.args.to,
        amount: parsed.args.value,
        timestamp: 0, // Will be filled by fetchBlockTimestamp
      };
    } catch (error) {
      console.error('Error parsing transfer log:', error);
      return null;
    }
  }

  /**
   * Fetch block timestamp
   */
  async fetchBlockTimestamp(blockNumber: number): Promise<number> {
    try {
      const block = await this.provider.getBlock(blockNumber);
      return block?.timestamp || 0;
    } catch (error) {
      console.error(`Error fetching block ${blockNumber}:`, error);
      return 0;
    }
  }

  /**
   * Fetch deposits with timestamps (batched block fetches)
   */
  async fetchDepositsWithTimestamps(
    walletAddress: string,
    fromBlock: number = 0,
    toBlock: number | 'latest' = 'latest'
  ): Promise<TransferEvent[]> {
    const transfers = await this.fetchDeposits(walletAddress, fromBlock, toBlock);

    // Batch fetch unique block timestamps
    const uniqueBlocks = [...new Set(transfers.map((t) => t.blockNumber))];
    const blockTimestamps = new Map<number, number>();

    console.log(`Fetching timestamps for ${uniqueBlocks.length} unique blocks`);

    for (const blockNum of uniqueBlocks) {
      const timestamp = await this.fetchBlockTimestamp(blockNum);
      blockTimestamps.set(blockNum, timestamp);

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Add timestamps to transfers
    return transfers.map((t) => ({
      ...t,
      timestamp: blockTimestamps.get(t.blockNumber) || 0,
    }));
  }

  /**
   * Convert USDC amount from wei to decimal
   */
  convertAmount(amount: bigint): number {
    return Number(amount) / Math.pow(10, this.usdcDecimals);
  }

  /**
   * Get current block number
   */
  async getCurrentBlockNumber(): Promise<number> {
    return await this.provider.getBlockNumber();
  }

  /**
   * Helper to convert TransferEvent to Deposit model format
   */
  transferToDeposit(transfer: TransferEvent, participantId: number, wallet: string): Omit<Deposit, 'id' | 'created_at'> {
    return {
      participant_id: participantId,
      wallet: wallet.toLowerCase(),
      tx_hash: transfer.txHash,
      block_number: transfer.blockNumber,
      amount: this.convertAmount(transfer.amount),
      timestamp: new Date(transfer.timestamp * 1000),
    };
  }
}

/**
 * Retry wrapper with exponential backoff for transient errors
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on certain errors
      if (error.code === 'INVALID_ARGUMENT') {
        throw error;
      }

      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}
