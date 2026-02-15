-- Add study_mode and self_evaluation columns to themes table if they don't exist
-- Run this in Supabase SQL Editor to fix "column not found" errors

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'themes' AND column_name = 'study_mode') THEN
        ALTER TABLE themes ADD COLUMN study_mode text DEFAULT 'questions';
        COMMENT ON COLUMN themes.study_mode IS 'questions OR free';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'themes' AND column_name = 'self_evaluation') THEN
        ALTER TABLE themes ADD COLUMN self_evaluation text;
        COMMENT ON COLUMN themes.self_evaluation IS 'confiante, razoavel, revisar (only for free mode)';
    END IF;
END $$;
