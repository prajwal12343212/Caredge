-- ============================================================
-- Secure Single-Use Token Migration
-- Run this in Supabase SQL Editor AFTER the previous migrations
-- ============================================================

-- 1. Drop old plaintext token column
ALTER TABLE public.access_tokens DROP COLUMN IF EXISTS token;

-- 2. Drop old is_active column (replaced by revoked + used_at logic)
ALTER TABLE public.access_tokens DROP COLUMN IF EXISTS is_active;

-- 3. Add hashed token column
-- First add it as nullable
ALTER TABLE public.access_tokens ADD COLUMN hashed_token text;

-- Assign a random unique placeholder to any existing rows to prevent unique constraint violations
UPDATE public.access_tokens SET hashed_token = gen_random_uuid()::text WHERE hashed_token IS NULL;

-- Now enforce constraints
ALTER TABLE public.access_tokens ALTER COLUMN hashed_token SET NOT NULL;
ALTER TABLE public.access_tokens ADD CONSTRAINT access_tokens_hashed_token_key UNIQUE (hashed_token);
-- 4. Add single-use tracking
ALTER TABLE public.access_tokens ADD COLUMN used_at timestamptz;
ALTER TABLE public.access_tokens ADD COLUMN used_by uuid REFERENCES public.profiles(id);

-- 5. Add revocation flag (clearer semantics than is_active)
ALTER TABLE public.access_tokens ADD COLUMN revoked boolean DEFAULT false NOT NULL;

-- 6. Create index for fast O(1) lookups during validation
CREATE INDEX IF NOT EXISTS idx_access_tokens_hashed_token ON public.access_tokens(hashed_token);

-- 7. Composite index for the patient dashboard (list all tokens for a patient)
CREATE INDEX IF NOT EXISTS idx_access_tokens_patient_id ON public.access_tokens(patient_id, created_at DESC);

-- 8. Cleanup function: remove stale tokens older than 30 days
CREATE OR REPLACE FUNCTION cleanup_expired_tokens() RETURNS void AS $$
BEGIN
  DELETE FROM public.access_tokens
  WHERE (expires_at < NOW() - INTERVAL '30 days')
     OR (revoked = true AND created_at < NOW() - INTERVAL '30 days')
     OR (used_at IS NOT NULL AND used_at < NOW() - INTERVAL '30 days');
END;
$$ LANGUAGE plpgsql;
