-- 1. Backfill existing data from user_preferences to profiles
UPDATE public.profiles p
SET 
    full_name = up.nome,
    exam_date = up.data_prova,
    study_days_per_week = up.dias_disponiveis_semana
FROM public.user_preferences up
WHERE p.id = up.user_id
AND (p.full_name IS NULL OR p.exam_date IS NULL OR p.study_days_per_week IS NULL);

-- 2. Create function to keep them in sync
CREATE OR REPLACE FUNCTION public.handle_sync_user_preferences_to_profile()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.profiles
    SET 
        full_name = NEW.nome,
        exam_date = NEW.data_prova,
        study_days_per_week = NEW.dias_disponiveis_semana,
        onboarding_completed = COALESCE(NEW.onboarding_completed, profiles.onboarding_completed)
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create trigger
DROP TRIGGER IF EXISTS on_user_preferences_sync ON public.user_preferences;
CREATE TRIGGER on_user_preferences_sync
AFTER INSERT OR UPDATE ON public.user_preferences
FOR EACH ROW EXECUTE FUNCTION public.handle_sync_user_preferences_to_profile();
