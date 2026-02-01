-- Feedback Table Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Feedback table
CREATE TABLE feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    message TEXT,
    email VARCHAR(255),
    page_url TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert feedback (anonymous feedback)
CREATE POLICY "Anyone can submit feedback"
    ON feedback FOR INSERT
    WITH CHECK (true);

-- Only allow reading feedback via authenticated/admin access (optional)
-- For now, we'll allow no reads from client
CREATE POLICY "No public read access"
    ON feedback FOR SELECT
    USING (false);

-- Index for faster queries
CREATE INDEX idx_feedback_created_at ON feedback(created_at DESC);
