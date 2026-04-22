ALTER TABLE friendships ADD COLUMN expires_at DATETIME DEFAULT NULL;

CREATE INDEX idx_friendship_expires ON friendships (expires_at);
