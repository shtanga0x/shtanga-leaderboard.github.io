import { Router, Request, Response } from 'express';
import { LeaderboardModel } from '../db/models';

const router = Router();

/**
 * GET /api/leaderboard
 * Returns the current leaderboard data
 * Query params:
 *   - sortBy: 'entry_order' (default) or 'pnl'
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const sortBy = (req.query.sortBy as string) || 'entry_order';

    if (sortBy !== 'entry_order' && sortBy !== 'pnl') {
      return res.status(400).json({
        error: 'Invalid sortBy parameter. Must be "entry_order" or "pnl".',
      });
    }

    const leaderboard = await LeaderboardModel.getAll(sortBy);

    res.json({
      success: true,
      data: leaderboard,
      sortBy,
      count: leaderboard.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leaderboard',
    });
  }
});

export default router;
