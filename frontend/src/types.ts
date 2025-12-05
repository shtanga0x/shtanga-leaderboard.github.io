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

export interface LeaderboardResponse {
  success: boolean;
  data: LeaderboardEntry[];
  sortBy: 'entry_order' | 'pnl';
  count: number;
  timestamp: string;
}
