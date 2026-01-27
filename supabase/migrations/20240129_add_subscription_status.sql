-- Add subscription_status column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'free';

-- Add check constraint for valid values
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS subscription_status_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT subscription_status_check 
CHECK (subscription_status IN ('trial', 'active', 'expired', 'free'));

-- Backfill data based on existing columns
-- Priority: Premium/Plan > Trial > Free
UPDATE public.profiles
SET subscription_status = CASE
    WHEN is_premium = true THEN 'active'
    WHEN plan IN ('monthly', 'lifetime') THEN 'active'
    WHEN trial_expires_at IS NOT NULL AND trial_expires_at > NOW() THEN 'trial'
    ELSE 'free'
END;
-- Note: usage OF 'free' as else case covers everything else.

-- Update check_theme_limit function to use ONLY subscription_status
CREATE OR REPLACE FUNCTION public.check_theme_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_sub_status text;
    v_theme_count int;
BEGIN
    SELECT subscription_status INTO v_sub_status 
    FROM public.profiles 
    WHERE id = auth.uid();
    
    -- Case: Active (Premium) or Trial -> Unlimited
    IF v_sub_status IN ('active', 'trial') THEN
        RETURN NEW;
    END IF;

    -- Case: Free or Expired -> Limited
    SELECT count(*) INTO v_theme_count 
    FROM public.themes 
    WHERE user_id = auth.uid();
    
    IF v_theme_count >= 10 THEN
        RAISE EXCEPTION 'Limite do plano gratuito atingido (Max: 10 temas). Faça upgrade para continuar.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
