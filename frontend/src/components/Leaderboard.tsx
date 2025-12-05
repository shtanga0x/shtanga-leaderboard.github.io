import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Link,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Alert,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import { leaderboardApi } from '../services/api';
import { LeaderboardEntry } from '../types';
import { formatCurrency, getPolymarketProfileUrl } from '../config';

export default function Leaderboard() {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'entry_order' | 'pnl'>('entry_order');
  const [lastUpdate, setLastUpdate] = useState<string>('');

  const fetchData = async (sort: 'entry_order' | 'pnl') => {
    setLoading(true);
    setError(null);

    try {
      const response = await leaderboardApi.getLeaderboard(sort);
      setData(response.data);
      setLastUpdate(new Date(response.timestamp).toLocaleString());
    } catch (err: any) {
      setError(err.message || 'Failed to fetch leaderboard data');
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(sortBy);
  }, [sortBy]);

  const handleSortChange = (_event: React.MouseEvent<HTMLElement>, newSort: 'entry_order' | 'pnl' | null) => {
    if (newSort !== null) {
      setSortBy(newSort);
    }
  };

  const renderPnL = (pnl: number) => {
    const color = pnl >= 0 ? 'success.main' : 'error.main';
    const formatted = formatCurrency(pnl, true);

    return (
      <Typography
        variant="body2"
        fontWeight="bold"
        sx={{ color }}
      >
        {formatted}
      </Typography>
    );
  };

  const renderBadges = (entry: LeaderboardEntry) => {
    const badges = [];

    if (entry.is_low_dep) {
      badges.push(
        <Chip
          key="low-dep"
          label="Low Deposit"
          size="small"
          color="warning"
          sx={{ mr: 0.5 }}
        />
      );
    }

    if (entry.is_high_dep) {
      badges.push(
        <Chip
          key="high-dep"
          label="High Deposit"
          size="small"
          color="info"
          sx={{ mr: 0.5 }}
        />
      );
    }

    if (entry.is_old) {
      badges.push(
        <Chip
          key="old"
          label="Old Account"
          size="small"
          color="default"
          sx={{ mr: 0.5 }}
        />
      );
    }

    return <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{badges}</Box>;
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
          Polymarket Tournament Leaderboard
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Track participant performance and rankings
        </Typography>
        {lastUpdate && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Last updated: {lastUpdate}
          </Typography>
        )}
      </Box>

      {/* Sort Controls */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
        <ToggleButtonGroup
          value={sortBy}
          exclusive
          onChange={handleSortChange}
          aria-label="sort by"
          size="small"
        >
          <ToggleButton value="entry_order" aria-label="sort by entry order">
            <FormatListNumberedIcon sx={{ mr: 1 }} />
            Entry Order
          </ToggleButton>
          <ToggleButton value="pnl" aria-label="sort by pnl">
            <TrendingUpIcon sx={{ mr: 1 }} />
            Sort by PnL
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Data Table */}
      {!loading && !error && (
        <TableContainer component={Paper} elevation={2}>
          <Table sx={{ minWidth: 650 }} aria-label="leaderboard table">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell><strong>Rank</strong></TableCell>
                <TableCell><strong>Nickname</strong></TableCell>
                <TableCell><strong>Wallet</strong></TableCell>
                <TableCell align="right"><strong>Portfolio Value</strong></TableCell>
                <TableCell align="right"><strong>Total Deposits</strong></TableCell>
                <TableCell align="right"><strong>PnL</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      No participants found. Contact admin to seed data.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                data.map((entry, index) => (
                  <TableRow
                    key={entry.wallet}
                    sx={{
                      '&:nth-of-type(odd)': { bgcolor: 'action.hover' },
                      '&:hover': { bgcolor: 'action.selected' },
                    }}
                  >
                    <TableCell>
                      {sortBy === 'entry_order' ? entry.entry_order : index + 1}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={getPolymarketProfileUrl(entry.wallet)}
                        target="_blank"
                        rel="noopener noreferrer"
                        underline="hover"
                        color="primary"
                        fontWeight="medium"
                      >
                        {entry.nickname}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                          color: 'text.secondary',
                        }}
                      >
                        {entry.wallet.slice(0, 6)}...{entry.wallet.slice(-4)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(entry.portfolio_value)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(entry.deposit_sum)}
                    </TableCell>
                    <TableCell align="right">
                      {renderPnL(entry.pnl)}
                    </TableCell>
                    <TableCell>
                      {renderBadges(entry)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Legend */}
      {!loading && !error && data.length > 0 && (
        <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="caption" component="div" gutterBottom fontWeight="bold">
            Badge Legend:
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="caption">
              <Chip label="Low Deposit" size="small" color="warning" sx={{ mr: 0.5 }} />
              Deposited less than $90
            </Typography>
            <Typography variant="caption">
              <Chip label="High Deposit" size="small" color="info" sx={{ mr: 0.5 }} />
              Deposited more than $110
            </Typography>
            <Typography variant="caption">
              <Chip label="Old Account" size="small" color="default" sx={{ mr: 0.5 }} />
              First trade before tournament start (2025-12-05)
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}
