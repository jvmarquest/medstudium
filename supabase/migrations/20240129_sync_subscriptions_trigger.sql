-- Sync function: updates profiles.subscription_status based on subscriptions.status
CREATE OR REPLACE FUNCTION public.sync_subscription_to_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Only act if status changed or is new
    IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) OR TG_OP = 'INSERT' THEN
        
        -- Active/Lifetime -> Active
        IF NEW.status IN ('active', 'lifetime') THEN
            UPDATE public.profiles 
            SET subscription_status = 'active', 
                is_premium = true -- Maintained for legacy compatibility
            WHERE id = NEW.user_id;

        -- Trialing -> Trial
        ELSIF NEW.status = 'trialing' THEN
            UPDATE public.profiles 
            SET subscription_status = 'trial',
                is_premium = true
            WHERE id = NEW.user_id;
            
        -- Canceled/Unpaid/PastDue -> Expired
        -- We map these to 'expired' to block access as per requirements ("expired" = Bloqueado)
        ELSIF NEW.status IN ('canceled', 'unpaid', 'incomplete_expired', 'past_due') THEN
             UPDATE public.profiles 
            SET subscription_status = 'expired',
                is_premium = false
            WHERE id = NEW.user_id;
        
        -- Note: If status becomes something else (undefined), we don't change profile to avoid accidental blocks.
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
DROP TRIGGER IF EXISTS on_subscription_change ON public.subscriptions;
CREATE TRIGGER on_subscription_change
AFTER INSERT OR UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.sync_subscription_to_profile();
