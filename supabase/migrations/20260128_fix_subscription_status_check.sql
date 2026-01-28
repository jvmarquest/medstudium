-- Update subscription_status check constraint to include 'canceled' and 'canceled_pending'
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS subscription_status_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT subscription_status_check 
CHECK (subscription_status IN ('trial', 'active', 'expired', 'free', 'canceled', 'canceled_pending'));
