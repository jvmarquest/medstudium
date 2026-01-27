-- Add 'dev' to plan constraint check if it exists or just allow it
DO $$
BEGIN
    -- Drop existing constraint if it exists to be safe and recreate it
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;
    
    -- Add updated constraint including 'dev'
    ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_plan_check 
    CHECK (plan IN ('free', 'monthly', 'lifetime', 'dev'));

EXCEPTION WHEN OTHERS THEN
    -- If table doesn't exist or other error, just log
    RAISE NOTICE 'Error updating constraint: %', SQLERRM;
END $$;
