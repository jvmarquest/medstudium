-- Migration: Update Theme Limit to 10

CREATE OR REPLACE FUNCTION public.check_theme_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_user_plan text;
    v_theme_count int;
    v_is_premium boolean;
BEGIN
    -- Get User Plan & Premium Status
    -- Avoiding ambiguity by aliasing table and using distinct variable names
    SELECT p.plan, p.is_premium INTO v_user_plan, v_is_premium 
    FROM public.profiles p
    WHERE p.id = auth.uid();
    
    -- Allow if Premium Flag is TRUE
    IF v_is_premium = true THEN
        RETURN NEW;
    END IF;

    -- Allow if Plan is NOT free (monthly/lifetime)
    IF v_user_plan IN ('monthly', 'lifetime') THEN
        RETURN NEW;
    END IF;

    -- Free Plan Limit Check
    SELECT count(*) INTO v_theme_count 
    FROM public.themes t
    WHERE t.user_id = auth.uid();
    
    -- UPDATED LIMIT: 10
    IF v_theme_count >= 10 THEN
        RAISE EXCEPTION 'Limite do plano gratuito atingido (Max: 10 temas). Faça upgrade para continuar.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
