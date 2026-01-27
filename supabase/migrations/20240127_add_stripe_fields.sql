-- Migration: Add Stripe Fields to Profiles
-- Description: Adds columns to store Stripe Customer ID, Subscription ID, and updates plan/status types.

-- 1. Add Columns if they don't exist
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;

-- 2. Create Index for faster lookup by stripe_customer_id (used in webhook)
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON public.profiles(stripe_customer_id);

-- 3. Verify RLS (Safety Check)
-- Ensure users can read their own payment data
CREATE POLICY "Users can view own profile payment data"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Webhook needs Service Role access (Bypass RLS), which is default for Edge Functions using Service Key.
