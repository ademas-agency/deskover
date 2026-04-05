-- Migration: add photos + curation_score columns to places table
-- Run this in your Supabase SQL editor

ALTER TABLE places ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]';
ALTER TABLE places ADD COLUMN IF NOT EXISTS curation_score INTEGER DEFAULT 0;
ALTER TABLE places ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ;

COMMENT ON COLUMN places.photos IS 'Array of storage paths for additional place photos';
COMMENT ON COLUMN places.curation_score IS 'Manual weight for ranking: positive = boosted, negative = demoted, 0 = natural';
COMMENT ON COLUMN places.last_verified_at IS 'Date of last manual verification by admin';
