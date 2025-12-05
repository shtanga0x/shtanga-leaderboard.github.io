-- Migration: Initial schema for Polymarket Tournament Leaderboard
-- Description: Creates participants, deposits, snapshots, and leaderboard_cache tables

-- Participants table: stores tournament participants
CREATE TABLE IF NOT EXISTS participants (
    id SERIAL PRIMARY KEY,
    entry_order INTEGER NOT NULL UNIQUE,
    nickname VARCHAR(255) NOT NULL,
    wallet VARCHAR(42) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_participants_wallet ON participants(wallet);
CREATE INDEX idx_participants_entry_order ON participants(entry_order);

-- Deposits table: stores on-chain deposit transactions
CREATE TABLE IF NOT EXISTS deposits (
    id SERIAL PRIMARY KEY,
    participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    wallet VARCHAR(42) NOT NULL,
    tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    amount NUMERIC(20, 6) NOT NULL, -- USDC amount (6 decimals)
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tx_hash, wallet)
);

CREATE INDEX idx_deposits_participant ON deposits(participant_id);
CREATE INDEX idx_deposits_wallet ON deposits(wallet);
CREATE INDEX idx_deposits_block ON deposits(block_number);

-- Snapshots table: stores periodic portfolio snapshots
CREATE TABLE IF NOT EXISTS snapshots (
    id SERIAL PRIMARY KEY,
    participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    portfolio_value NUMERIC(20, 6) NOT NULL,
    deposit_sum NUMERIC(20, 6) NOT NULL,
    pnl NUMERIC(20, 6) NOT NULL,
    is_low_dep BOOLEAN DEFAULT FALSE,
    is_high_dep BOOLEAN DEFAULT FALSE,
    is_old BOOLEAN DEFAULT FALSE,
    first_trade_date TIMESTAMP,
    snapshot_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_snapshots_participant ON snapshots(participant_id);
CREATE INDEX idx_snapshots_time ON snapshots(snapshot_time);

-- Leaderboard cache table: stores current leaderboard state
CREATE TABLE IF NOT EXISTS leaderboard_cache (
    id SERIAL PRIMARY KEY,
    participant_id INTEGER NOT NULL UNIQUE REFERENCES participants(id) ON DELETE CASCADE,
    entry_order INTEGER NOT NULL,
    nickname VARCHAR(255) NOT NULL,
    wallet VARCHAR(42) NOT NULL,
    portfolio_value NUMERIC(20, 6) NOT NULL DEFAULT 0,
    deposit_sum NUMERIC(20, 6) NOT NULL DEFAULT 0,
    pnl NUMERIC(20, 6) NOT NULL DEFAULT 0,
    is_low_dep BOOLEAN DEFAULT FALSE,
    is_high_dep BOOLEAN DEFAULT FALSE,
    is_old BOOLEAN DEFAULT FALSE,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_leaderboard_cache_pnl ON leaderboard_cache(pnl DESC);
CREATE INDEX idx_leaderboard_cache_entry_order ON leaderboard_cache(entry_order);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for participants table
CREATE TRIGGER update_participants_updated_at BEFORE UPDATE ON participants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
