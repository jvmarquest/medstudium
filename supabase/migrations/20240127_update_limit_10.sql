-- Migration: Update Theme Limit to 10

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

    -- Free Plan Limit Check
    SELECT count(*) INTO theme_count 
    FROM public.themes 
    WHERE user_id = auth.uid();
    
    -- UPDATED LIMIT: 10
    IF theme_count >= 10 THEN
        RAISE EXCEPTION 'Limite do plano gratuito atingido (Max: 10 temas). Faça upgrade para continuar.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
