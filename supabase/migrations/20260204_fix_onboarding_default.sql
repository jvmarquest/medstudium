-- Migration: Fix onboarding_completed default value
-- Created at: 2026-02-04
-- Purpose: Ensure new users always start with onboarding_completed = FALSE

-- 1. Set Default Value
ALTER TABLE public.profiles 
ALTER COLUMN onboarding_completed SET DEFAULT false;

-- 2. Backfill NULLs (if any)
UPDATE public.profiles 
SET onboarding_completed = false 
WHERE onboarding_completed IS NULL;

-- 3. Safety Check: If any new users (created in last 1 hour) have TRUE but no preferences, reset them?
-- Ideally no, but let's just stick to the default constraint for future insertions.
