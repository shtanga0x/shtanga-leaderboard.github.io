import { Router, Request, Response } from 'express';
import { ParticipantModel } from '../db/models';
import { refreshLeaderboard } from '../services/refreshService';

const router = Router();

// Simple admin authentication middleware
const adminAuth = (req: Request, res: Response, next: Function) => {
  const adminKey = req.headers['x-admin-key'];

  if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized - Invalid or missing admin key',
    });
  }

  next();
};

/**
 * POST /api/admin/participants
 * Bulk seed participants
 * Body: { participants: Array<{ entry_order, nickname, wallet }> }
 */
router.post('/participants', adminAuth, async (req: Request, res: Response) => {
  try {
    const { participants } = req.body;

    if (!Array.isArray(participants)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body. Expected { participants: Array }',
      });
    }

    // Validate participants data
    for (const p of participants) {
      if (!p.entry_order || !p.nickname || !p.wallet) {
        return res.status(400).json({
          success: false,
          error: 'Each participant must have entry_order, nickname, and wallet',
        });
      }

      // Basic wallet address validation
      if (!/^0x[a-fA-F0-9]{40}$/.test(p.wallet)) {
        return res.status(400).json({
          success: false,
          error: `Invalid wallet address: ${p.wallet}`,
        });
      }
    }

    await ParticipantModel.bulkCreate(participants);

    res.json({
      success: true,
      message: `Successfully seeded ${participants.length} participants`,
      count: participants.length,
    });
  } catch (error) {
    console.error('Error seeding participants:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to seed participants',
    });
  }
});

/**
 * POST /api/admin/refresh
 * Manually trigger leaderboard refresh
 */
router.post('/refresh', adminAuth, async (req: Request, res: Response) => {
  try {
    console.log('Manual refresh triggered by admin');

    // Run refresh in background (don't wait for completion)
    refreshLeaderboard()
      .then(() => {
        console.log('Manual refresh completed successfully');
      })
      .catch((error) => {
        console.error('Manual refresh failed:', error);
      });

    res.json({
      success: true,
      message: 'Refresh initiated. This may take several minutes.',
    });
  } catch (error) {
    console.error('Error triggering refresh:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger refresh',
    });
  }
});

/**
 * GET /api/admin/status
 * Get system status
 */
router.get('/status', adminAuth, async (req: Request, res: Response) => {
  try {
    const participants = await ParticipantModel.findAll();

    res.json({
      success: true,
      status: 'operational',
      participants: participants.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch status',
    });
  }
});

export default router;
