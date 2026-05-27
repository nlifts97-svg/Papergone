-- Run this in your Supabase SQL Editor
-- (If you already ran the first SQL, just run the ALTER TABLE lines at the bottom)

create table if not exists profiles (
  id uuid references auth.users primary key,
  email text,
  created_at timestamp default now()
);

create table if not exists groups (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  owner_id uuid references profiles(id),
  created_at timestamp default now()
);

create table if not exists group_members (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references groups(id) on delete cascade,
  user_id uuid references profiles(id),
  invited_email text,
  joined_at timestamp default now()
);

create table if not exists documents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id),
  group_id uuid references groups(id),
  type text,
  title text,
  summary text,
  fields jsonb,
  folder text,
  tags text[],
  reminder text,
  image_url text,
  created_at timestamp default now()
);

alter table profiles enable row level security;
alter table documents enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;

-- Drop existing policies if rerunning
drop policy if exists "Users see own profile" on profiles;
drop policy if exists "Users see own docs" on documents;
drop policy if exists "Users see shared docs" on documents;
drop policy if exists "Users manage own groups" on groups;
drop policy if exists "Members see their groups" on group_members;

create policy "Users see own profile" on profiles for all using (auth.uid() = id);
create policy "Users see own docs" on documents for all using (auth.uid() = user_id);
create policy "Users see shared docs" on documents for select using (
  group_id in (select group_id from group_members where user_id = auth.uid())
);
create policy "Users manage own groups" on groups for all using (auth.uid() = owner_id);
create policy "Members see their groups" on group_members for all using (auth.uid() = user_id);
