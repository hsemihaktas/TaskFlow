# TaskFlow - Görev Yönetim Sistemi

Supabase tabanlı görev ve proje yönetim sistemi. Next.js ve TypeScript ile geliştirilmiştir.

## Kurulum

1. **Gereksinimler**

   - Node.js 18+
   - Supabase hesabı

2. **Proje Kurulumu**

   ```bash
   npm install
   ```

3. **Supabase Konfigürasyonu**

   `.env.local` dosyasını düzenleyin:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Veritabanı Şeması ve Policy'ler**

   Aşağıdaki SQL komutlarını Supabase SQL Editor'e yapıştırarak tabloları ve policy'leri oluşturabilirsiniz:

   ```sql
   -- 🔹 1. Kullanıcı profili tablosu
   create table public.profiles (
     id uuid primary key references auth.users(id) on delete cascade,
     full_name text,
     created_at timestamptz default now()
   );

   -- 🔹 2. Şirket (organization) tablosu
   create table public.organizations (
     id uuid primary key default gen_random_uuid(),
     name text not null,
     created_by uuid references auth.users(id) on delete set null,
     created_at timestamptz default now()
   );

   -- 🔹 3. Şirket üyelikleri
   create table public.memberships (
     id uuid primary key default gen_random_uuid(),
     organization_id uuid references public.organizations(id) on delete cascade,
     user_id uuid references auth.users(id) on delete cascade,
     role text check (role in ('owner', 'admin', 'member')) default 'member',
     created_at timestamptz default now(),
     unique (organization_id, user_id)
   );

   -- 🔹 4. Projeler
   create table public.projects (
     id uuid primary key default gen_random_uuid(),
     organization_id uuid references public.organizations(id) on delete cascade,
     name text not null,
     description text,
     created_by uuid references auth.users(id),
     created_at timestamptz default now()
   );

   -- 🔹 5. Görevler
   create table public.tasks (
     id uuid primary key default gen_random_uuid(),
     project_id uuid references public.projects(id) on delete cascade,
     title text not null,
     description text,
     status text check (status in ('todo', 'in_progress', 'done')) default 'todo',
     assigned_to uuid references auth.users(id),
     created_by uuid references auth.users(id),
     created_at timestamptz default now(),
     updated_at timestamptz default now()
   );

   -- 🔹 6. Yeni kullanıcı eklendiğinde profiles’a otomatik ekleme
   create or replace function public.handle_new_user()
   returns trigger as $$
   begin
     insert into public.profiles (id, full_name)
     values (new.id, new.raw_user_meta_data->>'full_name');
     return new;
   end;
   $$ language plpgsql security definer;

   create trigger on_auth_user_created
   after insert on auth.users
   for each row
   execute function public.handle_new_user();

   -- 🔹 7. RLS aktif et
   alter table public.profiles enable row level security;
   alter table public.organizations enable row level security;
   alter table public.memberships enable row level security;
   alter table public.projects enable row level security;
   alter table public.tasks enable row level security;

   -- 🔹 8. Profiles Policy (herkes sadece kendi profilini görsün)
   create policy "Users can view own profile"
   on public.profiles
   for select using (auth.uid() = id);

   -- 🔹 9. Organizations Policy (sadece üyesi olanlar görebilir)
   create policy "Users can view organizations they belong to"
   on public.organizations
   for select using (
     exists (
       select 1 from public.memberships
       where memberships.organization_id = organizations.id
       and memberships.user_id = auth.uid()
     )
   );

   create policy "Owners can insert organizations"
   on public.organizations
   for insert with check (auth.uid() = created_by);

   -- 🔹 10. Memberships Policy
   create policy "Users can view memberships in their orgs"
   on public.memberships
   for select using (
     exists (
       select 1 from public.memberships m
       where m.organization_id = memberships.organization_id
       and m.user_id = auth.uid()
     )
   );

   create policy "Only owners or admins can add members"
   on public.memberships
   for insert with check (
     exists (
       select 1 from public.memberships
       where memberships.organization_id = memberships.organization_id
       and memberships.user_id = auth.uid()
       and memberships.role in ('owner', 'admin')
     )
   );

   -- 🔹 11. Projects Policy
   create policy "Members can view projects in their org"
   on public.projects
   for select using (
     exists (
       select 1 from public.memberships
       where memberships.organization_id = projects.organization_id
       and memberships.user_id = auth.uid()
     )
   );

   create policy "Owners/Admins can insert projects"
   on public.projects
   for insert with check (
     exists (
       select 1 from public.memberships
       where memberships.organization_id = projects.organization_id
       and memberships.user_id = auth.uid()
       and memberships.role in ('owner', 'admin')
     )
   );

   -- 🔹 12. Tasks Policy
   create policy "Members can view tasks in their org projects"
   on public.tasks
   for select using (
     exists (
       select 1
       from public.projects p
       join public.memberships m on m.organization_id = p.organization_id
       where p.id = tasks.project_id
       and m.user_id = auth.uid()
     )
   );

   create policy "Owners/Admins can insert tasks"
   on public.tasks
   for insert with check (
     exists (
       select 1
       from public.projects p
       join public.memberships m on m.organization_id = p.organization_id
       where p.id = tasks.project_id
       and m.user_id = auth.uid()
       and m.role in ('owner', 'admin')
     )
   );

   create policy "Assigned user or creator can update task status"
   on public.tasks
   for update using (
     auth.uid() = tasks.assigned_to
     or auth.uid() = tasks.created_by
   );
   ```

5. **Supabase Auth Ayarları**

   Supabase Dashboard > Authentication > Settings:

   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/dashboard`
   - Email confirmations: isteğe bağlı (geliştirme için kapatabilirsiniz)

6. **Projeyi Çalıştırın**
   ```bash
   npm run dev
   ```

## Özellikler

- ✅ Email/Password ile kayıt ve giriş
- ✅ Kullanıcı profil yönetimi
- ✅ Otomatik profile oluşturma (trigger ile)
- ✅ Row Level Security (RLS) ile güvenlik
- ✅ Responsive tasarım
- 🔄 Organizasyon yönetimi (yakında)
- 🔄 Proje yönetimi (yakında)
- 🔄 Görev yönetimi (yakında)

## Sayfalar

- `/` - Ana sayfa
- `/login` - Giriş sayfası
- `/register` - Kayıt sayfası
- `/dashboard` - Dashboard (giriş gerekli)

## Teknolojiler

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth)
- **Database**: PostgreSQL with RLS

### Gelişmiş Veritabanı Şeması ve Policy'ler

Aşağıdaki SQL komutlarını Supabase SQL Editor'e yapıştırarak gelişmiş tabloları ve policy'leri oluşturabilirsiniz:

```sql
-- ============================================================
-- TASKFLOW - Safe idempotent Supabase SQL (Auth + RLS)
-- ============================================================

-- 0) Gerekli extension
create extension if not exists "pgcrypto";

-- 1) PROFILES
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  position text,
  phone text,
  timezone text,
  is_premium boolean default false,
  created_at timestamptz default now()
);

-- 2) ORGANIZATIONS
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- 3) MEMBERSHIPS
create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  role text check (role in ('owner', 'admin', 'member')) default 'member',
  created_at timestamptz default now(),
  unique (user_id, organization_id)
);

-- 4) PROJECTS
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- 5) TASKS
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  title text not null,
  description text,
  status text check (status in ('todo', 'in_progress', 'done')) default 'todo',
  assigned_to uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6) SUBSCRIPTION_PLANS
create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  price numeric not null default 0,
  max_projects int not null default 3,
  max_members int not null default 5,
  features jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- 7) ORGANIZATION_SUBSCRIPTIONS
create table if not exists public.organization_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  plan_id uuid references public.subscription_plans(id),
  status text check (status in ('active', 'trial', 'expired')) default 'trial',
  current_period_start timestamptz default now(),
  current_period_end timestamptz,
  created_at timestamptz default now()
);

-- 8) Trigger: yeni auth.users satırı oluştuğunda profiles oluştur
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- Eğer profile zaten varsa hata verme (insert on conflict do nothing)
  begin
    insert into public.profiles (id, full_name, created_at)
    values (new.id, new.raw_user_meta_data->>'full_name', now());
  exception when unique_violation then
    -- ignore
  end;
  return new;
end;
$$ language plpgsql security definer;

-- drop existing trigger if present, then create
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- 9) Enable RLS on relevant tables
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.organization_subscriptions enable row level security;
alter table public.subscription_plans enable row level security;

-- 10) Policies
-- NOTE: use auth.uid()::uuid when comparing to uuid columns

-- Profiles
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles
  for select using (auth.uid()::uuid = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles
  for update using (auth.uid()::uuid = id)
  with check (auth.uid()::uuid = id);

-- Organizations
drop policy if exists "Users can view organizations they belong to" on public.organizations;
create policy "Users can view organizations they belong to"
  on public.organizations
  for select using (
    exists (
      select 1 from public.memberships m
      where m.organization_id = public.organizations.id
        and m.user_id = auth.uid()::uuid
    )
  );

drop policy if exists "Owners can insert organizations" on public.organizations;
create policy "Owners can insert organizations"
  on public.organizations
  for insert with check (auth.uid()::uuid = created_by);

-- Memberships
drop policy if exists "Users can view memberships in their orgs" on public.memberships;
create policy "Users can view memberships in their orgs"
  on public.memberships
  for select using (
    exists (
      select 1 from public.memberships m2
      where m2.organization_id = public.memberships.organization_id
        and m2.user_id = auth.uid()::uuid
    )
  );

drop policy if exists "Only owners or admins can add members" on public.memberships;
create policy "Only owners or admins can add members"
  on public.memberships
  for insert with check (
    exists (
      select 1 from public.memberships mm
      where mm.organization_id = public.memberships.organization_id
        and mm.user_id = auth.uid()::uuid
        and mm.role in ('owner','admin')
    )
  );

-- Projects
drop policy if exists "Members can view projects in their org" on public.projects;
create policy "Members can view projects in their org"
  on public.projects
  for select using (
    exists (
      select 1 from public.memberships m
      where m.organization_id = public.projects.organization_id
        and m.user_id = auth.uid()::uuid
    )
  );

drop policy if exists "Owners/Admins can insert projects" on public.projects;
create policy "Owners/Admins can insert projects"
  on public.projects
  for insert with check (
    exists (
      select 1 from public.memberships m2
      where m2.organization_id = public.projects.organization_id
        and m2.user_id = auth.uid()::uuid
        and m2.role in ('owner','admin')
    )
  );

-- Tasks
drop policy if exists "Members can view tasks in their org projects" on public.tasks;
create policy "Members can view tasks in their org projects"
  on public.tasks
  for select using (
    exists (
      select 1
      from public.projects p
      join public.memberships m on m.organization_id = p.organization_id
      where p.id = public.tasks.project_id
        and m.user_id = auth.uid()::uuid
    )
  );

drop policy if exists "Owners/Admins can insert tasks" on public.tasks;
create policy "Owners/Admins can insert tasks"
  on public.tasks
  for insert with check (
    exists (
      select 1
      from public.projects p
      join public.memberships m on m.organization_id = p.organization_id
      where p.id = public.tasks.project_id
        and m.user_id = auth.uid()::uuid
        and m.role in ('owner','admin')
    )
  );

drop policy if exists "Assigned user or creator can update task status" on public.tasks;
create policy "Assigned user or creator can update task status"
  on public.tasks
  for update using (
    auth.uid()::uuid = public.tasks.assigned_to
    or auth.uid()::uuid = public.tasks.created_by
  )
  with check (
    auth.uid()::uuid = public.tasks.assigned_to
    or auth.uid()::uuid = public.tasks.created_by
  );

-- Organization Subscriptions
drop policy if exists "Users can view their organization's subscription" on public.organization_subscriptions;
create policy "Users can view their organization's subscription"
  on public.organization_subscriptions
  for select using (
    exists (
      select 1 from public.memberships m
      where m.organization_id = public.organization_subscriptions.organization_id
        and m.user_id = auth.uid()::uuid
    )
  );

drop policy if exists "Owners/Admins can change subscription" on public.organization_subscriptions;
create policy "Owners/Admins can change subscription"
  on public.organization_subscriptions
  for update using (
    exists (
      select 1 from public.memberships m
      where m.organization_id = public.organization_subscriptions.organization_id
        and m.user_id = auth.uid()::uuid
        and m.role in ('owner','admin')
    )
  )
  with check (
    exists (
      select 1 from public.memberships m2
      where m2.organization_id = public.organization_subscriptions.organization_id
        and m2.user_id = auth.uid()::uuid
        and m2.role in ('owner','admin')
    )
  );

-- Subscription Plans (public read)
drop policy if exists "Plans are public" on public.subscription_plans;
create policy "Plans are public"
  on public.subscription_plans
  for select using (true);

-- 11) Sample seed plans (safe insert)
insert into public.subscription_plans (name, price, max_projects, max_members, features)
values
('Free', 0, 1, 3, '{"ai_assistant": false, "priority_support": false}'),
('Pro', 29, 10, 15, '{"ai_assistant": true, "priority_support": true}'),
('Enterprise', 99, 999, 999, '{"ai_assistant": true, "priority_support": true, "custom_domain": true}')
on conflict (name) do nothing;

-- ============================================================
-- End of script
-- ============================================================
```
