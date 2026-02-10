-- Add study_mode and self_evaluation columns to themes table
ALTER TABLE themes 
ADD COLUMN IF NOT EXISTS study_mode text DEFAULT 'questions',
ADD COLUMN IF NOT EXISTS self_evaluation text;

-- Add comment to explain values
COMMENT ON COLUMN themes.study_mode IS 'questions OR free';
COMMENT ON COLUMN themes.self_evaluation IS 'confiante, razoavel, revisar (only for free mode)';
