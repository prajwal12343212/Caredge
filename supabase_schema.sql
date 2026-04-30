-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles Table (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  role text not null check (role in ('patient', 'doctor')),
  full_name text not null,
  email text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Health Records Table
create table public.health_records (
  id uuid default uuid_generate_v4() primary key,
  patient_id uuid references public.profiles(id) on delete cascade not null,
  file_url text not null,
  file_name text not null,
  file_type text not null,
  uploaded_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Access Tokens Table
create table public.access_tokens (
  id uuid default uuid_generate_v4() primary key,
  patient_id uuid references public.profiles(id) on delete cascade not null,
  token text unique not null,
  expires_at timestamp with time zone not null,
  is_active boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Treatment Details Table
create table public.treatment_details (
  id uuid default uuid_generate_v4() primary key,
  patient_id uuid references public.profiles(id) on delete cascade not null,
  doctor_id uuid references public.profiles(id) on delete cascade not null,
  token_id uuid references public.access_tokens(id) on delete cascade not null,
  diagnosis text not null,
  prescription text not null,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Audit Logs Table
create table public.audit_logs (
  id uuid default uuid_generate_v4() primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_role text not null,
  action text not null,
  patient_id uuid references public.profiles(id) on delete cascade,
  doctor_id uuid references public.profiles(id) on delete cascade,
  token_id uuid references public.access_tokens(id) on delete set null,
  metadata jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create storage bucket for health records
insert into storage.buckets (id, name, public) values ('health-records', 'health-records', true);

-- Basic RLS for Profiles (Users can read their own profile, inserts handled via trigger if needed, or by app code)
alter table public.profiles enable row level security;
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
create policy "Users can insert their own profile." on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on public.profiles for update using (auth.uid() = id);

-- For simplicity in this demo, we'll allow all operations on these tables and enforce security in our Next.js API routes
-- In a real production app, you'd use strict RLS policies here based on auth.uid()
alter table public.health_records enable row level security;
create policy "Allow all operations for now (enforced in API)" on public.health_records for all using (true);

alter table public.access_tokens enable row level security;
create policy "Allow all operations for now (enforced in API)" on public.access_tokens for all using (true);

alter table public.treatment_details enable row level security;
create policy "Allow all operations for now (enforced in API)" on public.treatment_details for all using (true);

alter table public.audit_logs enable row level security;
create policy "Allow all operations for now (enforced in API)" on public.audit_logs for all using (true);

-- Allow public access to health-records bucket (since files are uploaded securely by our API)
create policy "Public Access" on storage.objects for select using (bucket_id = 'health-records');
create policy "Allow API Uploads" on storage.objects for insert with check (bucket_id = 'health-records');
create policy "Allow API Deletes" on storage.objects for delete using (bucket_id = 'health-records');
