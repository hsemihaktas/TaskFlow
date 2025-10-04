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
