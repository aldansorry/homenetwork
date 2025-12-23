-- Ensure uniqueness to allow idempotent sync
CREATE UNIQUE INDEX IF NOT EXISTS idx_videos_title_series ON videos (title, series);
CREATE UNIQUE INDEX IF NOT EXISTS idx_music_type_title ON music (type, title);
