-- ========== 014: Trả lời bình luận video ==========
-- Code SELECT/INSERT dùng parent_id + updated_at, nhưng 006 chưa có hai cột này.
-- Local được thêm thủ công qua psql → production thiếu → GET comments trả 500.

ALTER TABLE video_comments ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES video_comments(id) ON DELETE CASCADE;
ALTER TABLE video_comments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
