CREATE OR REPLACE FUNCTION public.check_theme_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_sub_status text;
    v_theme_count int;
BEGIN
    SELECT subscription_status INTO v_sub_status 
    FROM public.profiles 
    WHERE id = auth.uid();
    
    -- Case: Active (Premium) -> Unlimited
    -- Trial is now LIMITED to 10 themes, just like Free used to be.
    IF v_sub_status = 'active' THEN
        RETURN NEW;
    END IF;

    -- Case: Trial, Free, Expired -> Limited
    SELECT count(*) INTO v_theme_count 
    FROM public.themes 
    WHERE user_id = auth.uid();
    
    IF v_theme_count >= 10 THEN
        RAISE EXCEPTION 'Limite do plano atingido (Max: 10 temas). Faça upgrade para continuar.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
