-- Migration: Add current_period_end to profiles
-- Created at: 2026-01-28

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'current_period_end') THEN
        ALTER TABLE public.profiles ADD COLUMN current_period_end timestamptz;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'stripe_price_id') THEN
        ALTER TABLE public.profiles ADD COLUMN stripe_price_id text;
    END IF;
END $$;
