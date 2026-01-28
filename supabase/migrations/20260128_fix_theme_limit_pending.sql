-- Update check_theme_limit function to treat 'canceled_pending' as premium/unlimited
CREATE OR REPLACE FUNCTION public.check_theme_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_sub_status text;
    v_theme_count int;
BEGIN
    SELECT subscription_status INTO v_sub_status 
    FROM public.profiles 
    WHERE id = auth.uid();
    
    -- Case: Active (Premium), Trial, or Canceled Pending (Active until expiry) -> Unlimited
    IF v_sub_status IN ('active', 'trial', 'canceled_pending') THEN
        RETURN NEW;
    END IF;

    -- Case: Free, Expired, or Canceled -> Limited
    SELECT count(*) INTO v_theme_count 
    FROM public.themes 
    WHERE user_id = auth.uid();
    
    IF v_theme_count >= 10 THEN
        RAISE EXCEPTION 'Limite do plano gratuito atingido (Max: 10 temas). Faça upgrade para continuar.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
