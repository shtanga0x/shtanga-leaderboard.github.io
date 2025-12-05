import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;

  if (process.env.LOG_QUERIES === 'true') {
    console.log('Executed query', { text, duration, rows: res.rowCount });
  }

  return res.rows;
}

export async function getClient(): Promise<PoolClient> {
  return await pool.connect();
}

export async function closePool(): Promise<void> {
  await pool.end();
}

export default pool;
