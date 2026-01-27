-- Migration: Enforce Theme Limits for Free Users

-- 1. Create Function to Check Limit
CREATE OR REPLACE FUNCTION public.check_theme_limit()
RETURNS TRIGGER AS $$
DECLARE
    user_plan text;
    theme_count int;
    is_premium boolean;
BEGIN
    -- Get User Plan & Premium Status
    SELECT plan, is_premium INTO user_plan, is_premium 
    FROM public.profiles 
    WHERE id = auth.uid();
    
    -- Allow if Premium Flag is TRUE
    IF is_premium = true THEN
        RETURN NEW;
    END IF;

    -- Allow if Plan is NOT free (monthly/lifetime)
    IF user_plan IN ('monthly', 'lifetime') THEN
        RETURN NEW;
    END IF;

    -- If we are here, user is Free/Trial Expired.
    -- (Optionally check trial_expires_at here if DB logic is strictly required, 
    -- but usually 'is_premium' column should be kept in sync by cron/webhook for performance)

    -- Count existing themes
    SELECT count(*) INTO theme_count 
    FROM public.themes 
    WHERE user_id = auth.uid();
    
    IF theme_count >= 3 THEN
        RAISE EXCEPTION 'Limite do plano gratuito atingido (Max: 3 temas). Faça upgrade para continuar.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create Trigger
DROP TRIGGER IF EXISTS enforce_theme_limit ON public.themes;

CREATE TRIGGER enforce_theme_limit
BEFORE INSERT ON public.themes
FOR EACH ROW
EXECUTE FUNCTION check_theme_limit();
