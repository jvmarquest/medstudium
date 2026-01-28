-- Migration: Drop unused columns from profiles table
-- User request: Remove full_name, exam_date, study_days_per_week as they are stored in user_preferences

DO $$
BEGIN
    -- Drop full_name if exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'full_name') THEN
        ALTER TABLE public.profiles DROP COLUMN full_name;
    END IF;

    -- Drop exam_date if exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'exam_date') THEN
        ALTER TABLE public.profiles DROP COLUMN exam_date;
    END IF;

    -- Drop study_days_per_week if exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'study_days_per_week') THEN
        ALTER TABLE public.profiles DROP COLUMN study_days_per_week;
    END IF;
END $$;
