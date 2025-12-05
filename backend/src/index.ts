import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import leaderboardRoutes from './routes/leaderboard';
import adminRoutes from './routes/admin';
import { refreshLeaderboard } from './services/refreshService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

  // Set up cron job for periodic refresh
  const cronSchedule = process.env.UPDATE_CRON || '0 */12 * * *'; // Default: every 12 hours
  console.log(`📅 Scheduled refresh cron: ${cronSchedule}`);

  cron.schedule(cronSchedule, async () => {
    console.log('🔄 Starting scheduled leaderboard refresh...');
    try {
      await refreshLeaderboard();
      console.log('✅ Scheduled refresh completed');
    } catch (error) {
      console.error('❌ Scheduled refresh failed:', error);
    }
  });

  console.log('Ready to accept requests!');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});
