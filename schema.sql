-- Run these commands in your Neon Database Console (SQL Editor)

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Usage Logs Table (Tracks both Logged-in and Anonymous usage)
CREATE TABLE IF NOT EXISTS usage_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id), -- Nullable for anonymous users
    ip_address TEXT,                      -- For anonymous tracking
    tool_name VARCHAR(255),               -- Track which tool was used
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Indexes for fast lookup
CREATE INDEX idx_usage_log_user ON usage_logs(user_id);
CREATE INDEX idx_usage_log_ip ON usage_logs(ip_address);
