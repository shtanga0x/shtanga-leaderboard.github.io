import axios from 'axios';
import { LeaderboardResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const leaderboardApi = {
  /**
   * Fetch leaderboard data
   */
  async getLeaderboard(sortBy: 'entry_order' | 'pnl' = 'entry_order'): Promise<LeaderboardResponse> {
    const response = await apiClient.get<LeaderboardResponse>('/leaderboard', {
      params: { sortBy },
    });
    return response.data;
  },
};
