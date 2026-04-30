-- ==============================================================================
-- Supabase Authentication Trigger: Auto-create Profiles
-- Run this script in the Supabase SQL Editor.
-- This ensures a profile is created reliably even when email confirmations are ON.
-- ==============================================================================

-- 1. Create the function that will be called by the trigger
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    new.raw_user_meta_data->>'role'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- NOTE: SECURITY DEFINER ensures this function runs with superuser privileges, 
-- allowing it to bypass the Row-Level Security (RLS) policies on the profiles table.

-- 2. Attach the trigger to the auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
