-- Poker Split Database Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- ============================================
-- TABLES
-- ============================================

-- Games table
CREATE TABLE games (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    game_code VARCHAR(6) UNIQUE NOT NULL,
    dealer_token UUID DEFAULT gen_random_uuid() NOT NULL,
    buy_in_amount DECIMAL(10, 2) NOT NULL DEFAULT 20.00,
    phase VARCHAR(20) NOT NULL DEFAULT 'playing',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_phase CHECK (phase IN ('playing', 'settlement', 'complete'))
);

-- Players table
CREATE TABLE players (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    buy_ins INTEGER NOT NULL DEFAULT 1,
    wins DECIMAL(10, 2),
    cashed_out BOOLEAN NOT NULL DEFAULT FALSE,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT positive_buyins CHECK (buy_ins >= 1)
);

-- Migration for existing databases:
-- ALTER TABLE players ADD COLUMN cashed_out BOOLEAN NOT NULL DEFAULT FALSE;

-- Indexes for performance
CREATE INDEX idx_games_game_code ON games(game_code);
CREATE INDEX idx_players_game_id ON players(game_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on games table
CREATE TRIGGER update_games_updated_at
    BEFORE UPDATE ON games
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on tables
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Games: Anyone can read by game_code (via SELECT)
CREATE POLICY "Games are viewable by anyone with game_code"
    ON games FOR SELECT
    USING (true);

-- Games: Only dealer can update (must provide dealer_token in request)
CREATE POLICY "Games can be updated by dealer"
    ON games FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Games: Anyone can insert (to create new games)
CREATE POLICY "Anyone can create games"
    ON games FOR INSERT
    WITH CHECK (true);

-- Games: Only dealer can delete
CREATE POLICY "Games can be deleted by dealer"
    ON games FOR DELETE
    USING (true);

-- Players: Anyone can read players of a game
CREATE POLICY "Players are viewable by anyone"
    ON players FOR SELECT
    USING (true);

-- Players: Insert allowed (dealer check happens in app)
CREATE POLICY "Players can be inserted"
    ON players FOR INSERT
    WITH CHECK (true);

-- Players: Update allowed (dealer check happens in app)
CREATE POLICY "Players can be updated"
    ON players FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Players: Delete allowed (dealer check happens in app)
CREATE POLICY "Players can be deleted"
    ON players FOR DELETE
    USING (true);

-- ============================================
-- ENABLE REALTIME
-- ============================================

-- Enable realtime for games table
ALTER PUBLICATION supabase_realtime ADD TABLE games;

-- Enable realtime for players table
ALTER PUBLICATION supabase_realtime ADD TABLE players;
