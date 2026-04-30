-- AI Threat Detection & Security Monitoring Schema

-- 1. Security Incidents Table
create table public.security_incidents (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  user_role text not null,
  threat_type text not null,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  risk_score integer not null,
  description text not null,
  ip_address text,
  status text default 'active' check (status in ('active', 'resolved', 'ignored')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. User Risk Scores Table
create table public.user_risk_scores (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  total_score integer default 0 not null,
  last_evaluated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  risk_level text generated always as (
    case 
      when total_score <= 20 then 'safe'
      when total_score <= 50 then 'warning'
      when total_score <= 80 then 'suspicious'
      else 'high_risk'
    end
  ) stored
);

-- Basic RLS for the new tables (Allow all operations for now, enforced in API)
alter table public.security_incidents enable row level security;
create policy "Allow all operations for now (enforced in API)" on public.security_incidents for all using (true);

alter table public.user_risk_scores enable row level security;
create policy "Allow all operations for now (enforced in API)" on public.user_risk_scores for all using (true);
