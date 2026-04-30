-- 1. Profiles Table Updates
alter table public.profiles add column public_key text;
alter table public.profiles add column encrypted_data_key text;

-- 2. Access Tokens Updates
alter table public.access_tokens add column encrypted_data_key text;
alter table public.access_tokens add column iv text;

-- 3. Patient Health Profiles Updates
-- We need to change these to text so they can store base64 encrypted strings instead of arrays
alter table public.patient_health_profiles drop column allergies;
alter table public.patient_health_profiles add column allergies text;

alter table public.patient_health_profiles drop column chronic_diseases;
alter table public.patient_health_profiles add column chronic_diseases text;

alter table public.patient_health_profiles drop column current_medications;
alter table public.patient_health_profiles add column current_medications text;

alter table public.patient_health_profiles drop column past_surgeries;
alter table public.patient_health_profiles add column past_surgeries text;

alter table public.patient_health_profiles add column iv text;

-- 4. Health Records Updates
alter table public.health_records add column iv text;

-- 5. Treatment Details Updates
alter table public.treatment_details add column iv text;
