import { query, getClient } from './connection';

export interface Participant {
  id: number;
  entry_order: number;
  nickname: string;
  wallet: string;
  created_at: Date;
  updated_at: Date;
}

export interface Deposit {
  id: number;
  participant_id: number;
  wallet: string;
  tx_hash: string;
  block_number: number;
  amount: number;
  timestamp: Date;
  created_at: Date;
}

export interface Snapshot {
  id: number;
  participant_id: number;
  portfolio_value: number;
  deposit_sum: number;
  pnl: number;
  is_low_dep: boolean;
  is_high_dep: boolean;
  is_old: boolean;
  first_trade_date: Date | null;
  snapshot_time: Date;
  created_at: Date;
}

export interface LeaderboardEntry {
  entry_order: number;
  nickname: string;
  wallet: string;
  portfolio_value: number;
  deposit_sum: number;
  pnl: number;
  is_low_dep: boolean;
  is_high_dep: boolean;
  is_old: boolean;
}

// Participant operations
export const ParticipantModel = {
  async create(data: Omit<Participant, 'id' | 'created_at' | 'updated_at'>): Promise<Participant> {
    const rows = await query<Participant>(
      `INSERT INTO participants (entry_order, nickname, wallet)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.entry_order, data.nickname, data.wallet]
    );
    return rows[0];
  },

  async findAll(): Promise<Participant[]> {
    return await query<Participant>(
      'SELECT * FROM participants ORDER BY entry_order ASC'
    );
  },

  async findByWallet(wallet: string): Promise<Participant | null> {
    const rows = await query<Participant>(
      'SELECT * FROM participants WHERE wallet = $1',
      [wallet]
    );
    return rows[0] || null;
  },

  async bulkCreate(participants: Array<Omit<Participant, 'id' | 'created_at' | 'updated_at'>>): Promise<void> {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      for (const p of participants) {
        await client.query(
          `INSERT INTO participants (entry_order, nickname, wallet)
           VALUES ($1, $2, $3)
           ON CONFLICT (wallet) DO NOTHING`,
          [p.entry_order, p.nickname, p.wallet]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
};

// Deposit operations
export const DepositModel = {
  async create(data: Omit<Deposit, 'id' | 'created_at'>): Promise<Deposit> {
    const rows = await query<Deposit>(
      `INSERT INTO deposits (participant_id, wallet, tx_hash, block_number, amount, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (tx_hash, wallet) DO NOTHING
       RETURNING *`,
      [data.participant_id, data.wallet, data.tx_hash, data.block_number, data.amount, data.timestamp]
    );
    return rows[0];
  },

  async bulkCreate(deposits: Array<Omit<Deposit, 'id' | 'created_at'>>): Promise<void> {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      for (const d of deposits) {
        await client.query(
          `INSERT INTO deposits (participant_id, wallet, tx_hash, block_number, amount, timestamp)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (tx_hash, wallet) DO NOTHING`,
          [d.participant_id, d.wallet, d.tx_hash, d.block_number, d.amount, d.timestamp]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async sumByParticipant(participantId: number): Promise<number> {
    const rows = await query<{ total: string }>(
      'SELECT COALESCE(SUM(amount), 0) as total FROM deposits WHERE participant_id = $1',
      [participantId]
    );
    return parseFloat(rows[0].total);
  },

  async findByParticipant(participantId: number): Promise<Deposit[]> {
    return await query<Deposit>(
      'SELECT * FROM deposits WHERE participant_id = $1 ORDER BY block_number ASC',
      [participantId]
    );
  },
};

// Snapshot operations
export const SnapshotModel = {
  async create(data: Omit<Snapshot, 'id' | 'created_at'>): Promise<Snapshot> {
    const rows = await query<Snapshot>(
      `INSERT INTO snapshots (
        participant_id, portfolio_value, deposit_sum, pnl,
        is_low_dep, is_high_dep, is_old, first_trade_date, snapshot_time
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        data.participant_id,
        data.portfolio_value,
        data.deposit_sum,
        data.pnl,
        data.is_low_dep,
        data.is_high_dep,
        data.is_old,
        data.first_trade_date,
        data.snapshot_time,
      ]
    );
    return rows[0];
  },

  async getLatestByParticipant(participantId: number): Promise<Snapshot | null> {
    const rows = await query<Snapshot>(
      `SELECT * FROM snapshots
       WHERE participant_id = $1
       ORDER BY snapshot_time DESC
       LIMIT 1`,
      [participantId]
    );
    return rows[0] || null;
  },
};

// Leaderboard cache operations
export const LeaderboardModel = {
  async upsert(data: LeaderboardEntry & { participant_id: number }): Promise<void> {
    await query(
      `INSERT INTO leaderboard_cache (
        participant_id, entry_order, nickname, wallet,
        portfolio_value, deposit_sum, pnl,
        is_low_dep, is_high_dep, is_old, last_updated
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
      ON CONFLICT (participant_id)
      DO UPDATE SET
        entry_order = EXCLUDED.entry_order,
        nickname = EXCLUDED.nickname,
        wallet = EXCLUDED.wallet,
        portfolio_value = EXCLUDED.portfolio_value,
        deposit_sum = EXCLUDED.deposit_sum,
        pnl = EXCLUDED.pnl,
        is_low_dep = EXCLUDED.is_low_dep,
        is_high_dep = EXCLUDED.is_high_dep,
        is_old = EXCLUDED.is_old,
        last_updated = CURRENT_TIMESTAMP`,
      [
        data.participant_id,
        data.entry_order,
        data.nickname,
        data.wallet,
        data.portfolio_value,
        data.deposit_sum,
        data.pnl,
        data.is_low_dep,
        data.is_high_dep,
        data.is_old,
      ]
    );
  },

  async getAll(sortBy: 'entry_order' | 'pnl' = 'entry_order'): Promise<LeaderboardEntry[]> {
    const orderClause = sortBy === 'pnl' ? 'pnl DESC' : 'entry_order ASC';

    return await query<LeaderboardEntry>(
      `SELECT
        entry_order, nickname, wallet, portfolio_value,
        deposit_sum, pnl, is_low_dep, is_high_dep, is_old
       FROM leaderboard_cache
       ORDER BY ${orderClause}`
    );
  },

  async clear(): Promise<void> {
    await query('DELETE FROM leaderboard_cache');
  },
};
