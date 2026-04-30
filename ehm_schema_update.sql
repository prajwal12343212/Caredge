-- 1. Create Patient Health Profiles Table
create table public.patient_health_profiles (
  patient_id uuid references public.profiles(id) on delete cascade primary key,
  age integer,
  gender text,
  blood_group text,
  height text,
  weight text,
  emergency_contact text,
  allergies text[] default '{}',
  chronic_diseases text[] default '{}',
  current_medications text[] default '{}',
  past_surgeries text[] default '{}',
  family_history text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Basic RLS for the new table
alter table public.patient_health_profiles enable row level security;
create policy "Allow all operations for now (enforced in API)" on public.patient_health_profiles for all using (true);

-- 2. Add Category to Health Records
alter table public.health_records add column category text default 'General Document';
