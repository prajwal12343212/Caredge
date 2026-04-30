-- ============================================================
-- Revert End-to-End Encryption and Token Security
-- Run this in Supabase SQL Editor to restore MVP schema
-- ============================================================

-- 1. Profiles Table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS public_key;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS encrypted_data_key;

-- 2. Access Tokens Table
-- Re-add the plaintext token and is_active columns
ALTER TABLE public.access_tokens ADD COLUMN IF NOT EXISTS token text UNIQUE;
ALTER TABLE public.access_tokens ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL;

-- Populate token with a temporary UUID if needed, just to satisfy NOT NULL constraints if any
UPDATE public.access_tokens SET token = gen_random_uuid()::text WHERE token IS NULL;
ALTER TABLE public.access_tokens ALTER COLUMN token SET NOT NULL;

-- Drop all E2EE and single-use security columns
ALTER TABLE public.access_tokens DROP COLUMN IF EXISTS encrypted_data_key;
ALTER TABLE public.access_tokens DROP COLUMN IF EXISTS iv;
ALTER TABLE public.access_tokens DROP COLUMN IF EXISTS hashed_token;
ALTER TABLE public.access_tokens DROP COLUMN IF EXISTS used_at;
ALTER TABLE public.access_tokens DROP COLUMN IF EXISTS used_by;
ALTER TABLE public.access_tokens DROP COLUMN IF EXISTS revoked;

-- Drop cleanup function
DROP FUNCTION IF EXISTS cleanup_expired_tokens();

-- 3. Patient Health Profiles Table
-- Revert from text (which held base64) back to text arrays where appropriate
ALTER TABLE public.patient_health_profiles DROP COLUMN IF EXISTS allergies;
ALTER TABLE public.patient_health_profiles ADD COLUMN allergies text[] DEFAULT '{}';

ALTER TABLE public.patient_health_profiles DROP COLUMN IF EXISTS chronic_diseases;
ALTER TABLE public.patient_health_profiles ADD COLUMN chronic_diseases text[] DEFAULT '{}';

ALTER TABLE public.patient_health_profiles DROP COLUMN IF EXISTS current_medications;
ALTER TABLE public.patient_health_profiles ADD COLUMN current_medications text[] DEFAULT '{}';

ALTER TABLE public.patient_health_profiles DROP COLUMN IF EXISTS past_surgeries;
ALTER TABLE public.patient_health_profiles ADD COLUMN past_surgeries text[] DEFAULT '{}';

ALTER TABLE public.patient_health_profiles DROP COLUMN IF EXISTS iv;

-- 4. Health Records Table
ALTER TABLE public.health_records DROP COLUMN IF EXISTS encrypted_data_key;
ALTER TABLE public.health_records DROP COLUMN IF EXISTS iv;
ALTER TABLE public.health_records DROP COLUMN IF EXISTS category;
