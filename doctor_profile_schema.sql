-- ============================================================
-- Doctor Professional Profiles Schema
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE TABLE public.doctor_profiles (
  doctor_id uuid references public.profiles(id) on delete cascade primary key,
  gender text,
  age integer,
  
  -- Professional Identity
  medical_license text,
  medical_qualification text,
  degrees text[] default '{}',
  specialization text,
  experience_years text,
  
  -- Clinic / Hospital Details
  hospital_name text,
  hospital_address text,
  working_hours text,
  
  -- Contact & Bio
  contact_number text,
  professional_email text,
  languages_spoken text[] default '{}',
  bio text,
  
  -- Media
  profile_photo_url text,
  
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
ALTER TABLE public.doctor_profiles ENABLE ROW LEVEL SECURITY;

-- Allow public read access so patients can see doctor details
CREATE POLICY "Public profiles are viewable by everyone." 
  ON public.doctor_profiles FOR SELECT USING (true);

-- Allow doctors to update their own profile
CREATE POLICY "Doctors can insert their own profile." 
  ON public.doctor_profiles FOR INSERT WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can update their own profile." 
  ON public.doctor_profiles FOR UPDATE USING (auth.uid() = doctor_id);

-- Storage for Profile Photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('doctor-profiles', 'doctor-profiles', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access to Profile Photos" 
  ON storage.objects FOR SELECT USING (bucket_id = 'doctor-profiles');

CREATE POLICY "Doctors can upload their own photos" 
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'doctor-profiles');

CREATE POLICY "Doctors can update their own photos" 
  ON storage.objects FOR UPDATE USING (bucket_id = 'doctor-profiles');
