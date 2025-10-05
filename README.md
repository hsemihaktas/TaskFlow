# 🚀 TaskFlow - Modern Görev Yönetim Sistemi

TaskFlow, organizasyonlar için geliştirilmiş modern ve güvenli bir görev yönetim sistemidir. Next.js 15, TypeScript ve Supabase ile geliştirilmiştir.

## 📋 İçindekiler

- [Özellikler](#-özellikler)
- [Teknolojiler](#-teknolojiler)
- [Kurulum](#-kurulum)
- [Veritabanı Yapısı](#-veritabanı-yapısı)
- [Güvenlik (RLS Policies)](#-güvenlik-rls-policies)
- [Proje Yapısı](#-proje-yapısı)
- [API Kullanımı](#-api-kullanımı)
- [Supabase Fonksiyonları](#-supabase-fonksiyonları)
- [Kullanım Kılavuzu](#-kullanım-kılavuzu)
- [Sorun Giderme](#-sorun-giderme)

## ✨ Özellikler

### 🔐 Kimlik Doğrulama ve Yetkilendirme

- ✅ Email/Password ile güvenli kayıt ve giriş
- ✅ Otomatik profil oluşturma (Supabase Triggers)
- ✅ Avatar desteği
- ✅ Row Level Security (RLS) ile veri güvenliği

### 🏢 Organizasyon Yönetimi

- ✅ Organizasyon oluşturma ve yönetimi
- ✅ Üye davet sistemi (email ile)
- ✅ Rol tabanlı yetkilendirme (Owner/Admin/Member)
- ✅ Üye yönetimi ve rol güncelleme
- ✅ Organizasyon silme (sadece owner)

### 📊 Proje Yönetimi

- ✅ Organizasyon bazlı proje oluşturma
- ✅ Proje açıklaması ve detayları
- ✅ Proje silme (admin/owner yetkisi)
- ✅ Proje bazlı görev görüntüleme

### ✅ Görev Yönetimi

- ✅ Kanban board (Todo/In Progress/Done)
- ✅ Drag & drop ile görev durumu değiştirme
- ✅ Görev atama sistemi (çoklu atama destekli)
- ✅ Gerçek zamanlı güncellemeler (5 saniyelik polling)
- ✅ Avatar'lı atama görüntüleme
- ✅ Görev silme (admin/owner yetkisi)
- ✅ Görev detay paneli

### 🎨 Kullanıcı Arayüzü

- ✅ Modern ve responsive tasarım
- ✅ Tailwind CSS ile stil
- ✅ Custom confirmation modal'ları
- ✅ Loading state'leri ve animasyonlar
- ✅ Türkçe dil desteği

## 🛠 Teknolojiler

### Frontend

- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React Hooks** - State management

### Backend & Database

- **Supabase** - Backend as a Service
- **PostgreSQL** - Veritabanı
- **Row Level Security** - Veri güvenliği
- **Supabase Auth** - Kimlik doğrulama

## 🚀 Kurulum

### 1. Gereksinimler

- Node.js 18+
- npm veya yarn
- Supabase hesabı

### 2. Projeyi Klonlama

```bash
git clone https://github.com/hsemihaktas/TaskFlow.git
cd TaskFlow/task-flow
```

### 3. Bağımlılıkları Yükleme

```bash
npm install
# veya
yarn install
```

### 4. Environment Variables

`.env.local` dosyasını oluşturun:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 5. Supabase Kurulumu

Supabase Dashboard'da yeni bir proje oluşturun ve aşağıdaki adımları takip edin:

#### A) Authentication Settings

- **Site URL**: `http://localhost:3000`
- **Redirect URLs**: `http://localhost:3000/dashboard`
- **Email confirmations**: Geliştirme için kapatabilirsiniz

#### B) Veritabanı Şeması

Aşağıdaki SQL komutlarını Supabase SQL Editor'e yapıştırın:

```sql
-- ============================================
-- TASKFLOW - Complete Database Schema & RLS
-- ============================================

-- Extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  position text,
  phone text,
  timezone text DEFAULT 'Europe/Istanbul',
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- 2. ORGANIZATIONS TABLE
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- 3. MEMBERSHIPS TABLE (User-Organization relationship)
CREATE TABLE IF NOT EXISTS public.memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  role text CHECK (role IN ('owner', 'admin', 'member')) DEFAULT 'member',
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  UNIQUE (user_id, organization_id)
);

-- 4. PROJECTS TABLE
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- 5. TASKS TABLE
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text CHECK (status IN ('todo', 'in_progress', 'done')) DEFAULT 'todo',
  priority text CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- 6. TASK_ASSIGNMENTS TABLE (Many-to-Many for task assignments)
CREATE TABLE IF NOT EXISTS public.task_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at timestamptz DEFAULT NOW(),
  UNIQUE (task_id, assigned_to)
);

-- 7. INVITATIONS TABLE (For organization invites)
CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text CHECK (role IN ('admin', 'member')) DEFAULT 'member',
  token text UNIQUE DEFAULT encode(gen_random_bytes(32), 'base64url'),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at timestamptz,
  created_at timestamptz DEFAULT NOW()
);

-- 8. FUNCTION: Auto-create profile for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. TRIGGER: Execute function on new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 10. VIEW: Tasks with assignments (for easy querying)
CREATE OR REPLACE VIEW public.tasks_with_assignments AS
SELECT
  t.*,
  COALESCE(
    json_agg(
      json_build_object(
        'user_id', ta.assigned_to,
        'full_name', p.full_name,
        'avatar_url', p.avatar_url,
        'assigned_at', ta.assigned_at,
        'assigned_by', ta.assigned_by
      ) ORDER BY ta.assigned_at
    ) FILTER (WHERE ta.assigned_to IS NOT NULL),
    '[]'::json
  ) AS assignments
FROM public.tasks t
LEFT JOIN public.task_assignments ta ON ta.task_id = t.id
LEFT JOIN public.profiles p ON p.id = ta.assigned_to
GROUP BY t.id, t.project_id, t.title, t.description, t.status, t.priority, t.created_by, t.created_at, t.updated_at;

-- 11. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- 12. RLS POLICIES

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- Organizations Policies
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON public.organizations;
CREATE POLICY "Users can view organizations they belong to"
ON public.organizations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.organization_id = organizations.id
    AND m.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;
CREATE POLICY "Users can create organizations"
ON public.organizations FOR INSERT
WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Only owners can delete organizations" ON public.organizations;
CREATE POLICY "Only owners can delete organizations"
ON public.organizations FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.organization_id = organizations.id
    AND m.user_id = auth.uid()
    AND m.role = 'owner'
  )
);

-- Memberships Policies
DROP POLICY IF EXISTS "Users can view memberships in their orgs" ON public.memberships;
CREATE POLICY "Users can view memberships in their orgs"
ON public.memberships FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.memberships m2
    WHERE m2.organization_id = memberships.organization_id
    AND m2.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Only owners/admins can add members" ON public.memberships;
CREATE POLICY "Only owners/admins can add members"
ON public.memberships FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.organization_id = memberships.organization_id
    AND m.user_id = auth.uid()
    AND m.role IN ('owner', 'admin')
  )
);

DROP POLICY IF EXISTS "Only owners/admins can update memberships" ON public.memberships;
CREATE POLICY "Only owners/admins can update memberships"
ON public.memberships FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.organization_id = memberships.organization_id
    AND m.user_id = auth.uid()
    AND m.role IN ('owner', 'admin')
  )
);

-- Projects Policies
DROP POLICY IF EXISTS "Members can view projects in their org" ON public.projects;
CREATE POLICY "Members can view projects in their org"
ON public.projects FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.organization_id = projects.organization_id
    AND m.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Owners/Admins can create projects" ON public.projects;
CREATE POLICY "Owners/Admins can create projects"
ON public.projects FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.organization_id = projects.organization_id
    AND m.user_id = auth.uid()
    AND m.role IN ('owner', 'admin')
  )
);

DROP POLICY IF EXISTS "Owners/Admins can delete projects" ON public.projects;
CREATE POLICY "Owners/Admins can delete projects"
ON public.projects FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.organization_id = projects.organization_id
    AND m.user_id = auth.uid()
    AND m.role IN ('owner', 'admin')
  )
);

-- Tasks Policies
DROP POLICY IF EXISTS "Members can view tasks in their org projects" ON public.tasks;
CREATE POLICY "Members can view tasks in their org projects"
ON public.tasks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.memberships m ON m.organization_id = p.organization_id
    WHERE p.id = tasks.project_id
    AND m.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Owners/Admins can create tasks" ON public.tasks;
CREATE POLICY "Owners/Admins can create tasks"
ON public.tasks FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.memberships m ON m.organization_id = p.organization_id
    WHERE p.id = tasks.project_id
    AND m.user_id = auth.uid()
    AND m.role IN ('owner', 'admin')
  )
);

DROP POLICY IF EXISTS "Assigned users or admins can update tasks" ON public.tasks;
CREATE POLICY "Assigned users or admins can update tasks"
ON public.tasks FOR UPDATE
USING (
  -- Kullanıcı göreve atanmış
  EXISTS (
    SELECT 1 FROM public.task_assignments ta
    WHERE ta.task_id = tasks.id
    AND ta.assigned_to = auth.uid()
  )
  OR
  -- Kullanıcı admin/owner
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.memberships m ON m.organization_id = p.organization_id
    WHERE p.id = tasks.project_id
    AND m.user_id = auth.uid()
    AND m.role IN ('owner', 'admin')
  )
);

DROP POLICY IF EXISTS "Owners/Admins can delete tasks" ON public.tasks;
CREATE POLICY "Owners/Admins can delete tasks"
ON public.tasks FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.memberships m ON m.organization_id = p.organization_id
    WHERE p.id = tasks.project_id
    AND m.user_id = auth.uid()
    AND m.role IN ('owner', 'admin')
  )
);

-- Task Assignments Policies
DROP POLICY IF EXISTS "Members can view task assignments in their org" ON public.task_assignments;
CREATE POLICY "Members can view task assignments in their org"
ON public.task_assignments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.projects p ON p.id = t.project_id
    JOIN public.memberships m ON m.organization_id = p.organization_id
    WHERE t.id = task_assignments.task_id
    AND m.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Owners/Admins can assign tasks" ON public.task_assignments;
CREATE POLICY "Owners/Admins can assign tasks"
ON public.task_assignments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.projects p ON p.id = t.project_id
    JOIN public.memberships m ON m.organization_id = p.organization_id
    WHERE t.id = task_assignments.task_id
    AND m.user_id = auth.uid()
    AND m.role IN ('owner', 'admin')
  )
);

DROP POLICY IF EXISTS "Owners/Admins can remove task assignments" ON public.task_assignments;
CREATE POLICY "Owners/Admins can remove task assignments"
ON public.task_assignments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.projects p ON p.id = t.project_id
    JOIN public.memberships m ON m.organization_id = p.organization_id
    WHERE t.id = task_assignments.task_id
    AND m.user_id = auth.uid()
    AND m.role IN ('owner', 'admin')
  )
);

-- Invitations Policies
DROP POLICY IF EXISTS "Members can view invitations in their org" ON public.invitations;
CREATE POLICY "Members can view invitations in their org"
ON public.invitations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.organization_id = invitations.organization_id
    AND m.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Owners/Admins can create invitations" ON public.invitations;
CREATE POLICY "Owners/Admins can create invitations"
ON public.invitations FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.organization_id = invitations.organization_id
    AND m.user_id = auth.uid()
    AND m.role IN ('owner', 'admin')
  )
);
```

### 6. Projeyi Çalıştırma

```bash
npm run dev
```

Tarayıcınızda `http://localhost:3000` adresine gidin.

## 🗄️ Veritabanı Yapısı

### Tablo İlişkileri

```
auth.users (Supabase Auth)
    ↓ (1:1)
profiles
    ↓ (1:N)
memberships ←→ organizations (N:1)
    ↓ (N:1)         ↓ (1:N)
task_assignments ←→ projects (N:1)
    ↓ (N:1)         ↓ (1:N)
tasks ←←←←←←←←←←←←←←←
```

### Ana Tablolar

#### 1. `profiles`

Kullanıcı profil bilgileri (auth.users ile 1:1 ilişki)

```sql
Column        | Type                     | Description
------------- | ------------------------ | ---------------------------
id            | uuid (PK, FK)           | auth.users.id referansı
full_name     | text                    | Kullanıcının tam adı
avatar_url    | text                    | Profil resmi URL'i
position      | text                    | İş pozisyonu
phone         | text                    | Telefon numarası
timezone      | text                    | Saat dilimi
created_at    | timestamptz             | Oluşturulma tarihi
updated_at    | timestamptz             | Güncellenme tarihi
```

#### 2. `organizations`

Şirket/organizasyon bilgileri

```sql
Column        | Type                     | Description
------------- | ------------------------ | ---------------------------
id            | uuid (PK)               | Unique identifier
name          | text                    | Organizasyon adı
description   | text                    | Açıklama
created_by    | uuid (FK)               | Oluşturan kullanıcı
created_at    | timestamptz             | Oluşturulma tarihi
updated_at    | timestamptz             | Güncellenme tarihi
```

#### 3. `memberships`

Kullanıcı-organizasyon ilişkisi ve rolleri

```sql
Column          | Type                     | Description
--------------- | ------------------------ | ---------------------------
id              | uuid (PK)               | Unique identifier
user_id         | uuid (FK)               | Kullanıcı referansı
organization_id | uuid (FK)               | Organizasyon referansı
role            | text                    | Rol (owner/admin/member)
created_at      | timestamptz             | Oluşturulma tarihi
updated_at      | timestamptz             | Güncellenme tarihi
```

**Roller ve Yetkileri:**

- **Owner**: Tüm yetkiler, organizasyonu silebilir, rolleri değiştirebilir
- **Admin**: Proje/görev yönetimi, üye davet edebilir, üye rollerini değiştirebilir (owner hariç)
- **Member**: Sadece atandığı görevleri yönetebilir, görüntüleme yetkisi

#### 4. `projects`

Proje bilgileri

```sql
Column          | Type                     | Description
--------------- | ------------------------ | ---------------------------
id              | uuid (PK)               | Unique identifier
organization_id | uuid (FK)               | Bağlı organizasyon
name            | text                    | Proje adı
description     | text                    | Proje açıklaması
created_by      | uuid (FK)               | Oluşturan kullanıcı
created_at      | timestamptz             | Oluşturulma tarihi
updated_at      | timestamptz             | Güncellenme tarihi
```

#### 5. `tasks`

Görev bilgileri

```sql
Column        | Type                     | Description
------------- | ------------------------ | ---------------------------
id            | uuid (PK)               | Unique identifier
project_id    | uuid (FK)               | Bağlı proje
title         | text                    | Görev başlığı
description   | text                    | Görev açıklaması
status        | text                    | Durum (todo/in_progress/done)
priority      | text                    | Öncelik (low/medium/high)
created_by    | uuid (FK)               | Oluşturan kullanıcı
created_at    | timestamptz             | Oluşturulma tarihi
updated_at    | timestamptz             | Güncellenme tarihi
```

#### 6. `task_assignments`

Görev atama bilgileri (N:M ilişki)

```sql
Column        | Type                     | Description
------------- | ------------------------ | ---------------------------
id            | uuid (PK)               | Unique identifier
task_id       | uuid (FK)               | Görev referansı
assigned_to   | uuid (FK)               | Atanan kullanıcı
assigned_by   | uuid (FK)               | Atayan kullanıcı
assigned_at   | timestamptz             | Atama tarihi
```

#### 7. `invitations`

Organizasyon davet sistemi

```sql
Column          | Type                     | Description
--------------- | ------------------------ | ---------------------------
id              | uuid (PK)               | Unique identifier
organization_id | uuid (FK)               | Davet edilen organizasyon
email           | text                    | Davet edilen email
role            | text                    | Verilecek rol (admin/member)
token           | text                    | Davet tokeni
invited_by      | uuid (FK)               | Davet eden kullanıcı
expires_at      | timestamptz             | Son geçerlilik tarihi
accepted_at     | timestamptz             | Kabul edilme tarihi
created_at      | timestamptz             | Oluşturulma tarihi
```

## 🔐 Güvenlik (RLS Policies)

Row Level Security (RLS) ile tüm veriler korunmaktadır. Her tablo için ayrı güvenlik kuralları tanımlanmıştır:

### Profiles Güvenliği

- Kullanıcılar sadece **kendi profillerini** görebilir ve düzenleyebilir
- Diğer kullanıcı profilleri sadece aynı organizasyonda üyelik varsa görünür

### Organizations Güvenliği

- Kullanıcılar sadece **üyesi oldukları organizasyonları** görebilir
- Sadece **owner** organizasyon silebilir
- Herkes kendi organizasyonunu oluşturabilir

### Memberships Güvenliği

- Organizasyon üyelikleri sadece **aynı organizasyon üyeleri** tarafından görülebilir
- Sadece **owner/admin** yeni üye ekleyebilir
- **Owner** tüm rolleri değiştirebilir, **admin** sadece member rolünü değiştirebilir

### Projects Güvenliği

- Projeler sadece **organizasyon üyeleri** tarafından görülebilir
- Sadece **owner/admin** proje oluşturabilir ve silebilir
- Tüm üyeler proje detaylarını görüntüleyebilir

### Tasks Güvenliği

- Görevler sadece **organizasyon üyeleri** tarafından görülebilir
- Sadece **owner/admin** görev oluşturabilir ve silebilir
- **Atanan kullanıcılar** görev durumunu değiştirebilir
- **Owner/admin** her zaman görev güncelleyebilir

### Task Assignments Güvenliği

- Atamalar sadece **organizasyon üyeleri** tarafından görülebilir
- Sadece **owner/admin** görev atayabilir ve atamaları kaldırabilir
- Cascade delete ile görev silindiğinde otomatik olarak atamalar da silinir

## 📁 Proje Yapısı

```
taskflow/
├── app/                        # Next.js App Router
│   ├── layout.tsx             # Root layout
│   ├── page.tsx               # Ana sayfa
│   ├── globals.css            # Global CSS
│   ├── dashboard/
│   │   └── page.tsx          # Dashboard sayfası
│   ├── login/
│   │   └── page.tsx          # Giriş sayfası
│   ├── register/
│   │   └── page.tsx          # Kayıt sayfası
│   ├── organization/
│   │   └── [id]/
│   │       └── page.tsx      # Organizasyon detay sayfası
│   └── project/
│       └── [id]/
│           └── page.tsx      # Proje detay sayfası (Kanban)
├── components/                # React bileşenleri
│   ├── ui/                   # Genel UI bileşenleri
│   │   └── ConfirmDialog.tsx # Custom onay modalı
│   ├── dashboard/            # Dashboard bileşenleri
│   │   ├── CreateOrganizationModal.tsx
│   │   ├── CreateProjectModal.tsx
│   │   └── MemberManagementModal.tsx
│   ├── organization/         # Organizasyon bileşenleri
│   │   └── InviteMemberModal.tsx
│   ├── project/              # Proje bileşenleri
│   │   ├── CreateTaskModal.tsx
│   │   ├── TaskCard.tsx      # Görev kartı
│   │   └── TaskDetailPanel.tsx
│   └── Navbar.tsx            # Navigation bar
├── contexts/                 # React Context'ler
│   └── AuthContext.tsx       # Kimlik doğrulama context
├── lib/                      # Utility fonksiyonlar
│   └── supabase.ts          # Supabase client konfigürasyonu
├── types/                    # TypeScript tip tanımları
└── public/                   # Static dosyalar
```

## 🔧 API Kullanımı

### Supabase Client Konfigürasyonu

```typescript
// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Temel CRUD İşlemleri

#### Organizasyon Oluşturma

```typescript
const createOrganization = async (name: string) => {
  const { data, error } = await supabase
    .from("organizations")
    .insert([
      {
        name,
        created_by: user?.id,
      },
    ])
    .select()
    .single();

  if (!error) {
    // Kullanıcıyı owner olarak ekle
    await supabase.from("memberships").insert([
      {
        user_id: user?.id,
        organization_id: data.id,
        role: "owner",
      },
    ]);
  }

  return { data, error };
};
```

#### Görev Oluşturma

```typescript
const createTask = async (
  projectId: string,
  title: string,
  description: string
) => {
  const { data, error } = await supabase
    .from("tasks")
    .insert([
      {
        project_id: projectId,
        title,
        description,
        created_by: user?.id,
      },
    ])
    .select()
    .single();

  return { data, error };
};
```

#### Görev Atama

```typescript
const assignTask = async (taskId: string, userId: string) => {
  const { error } = await supabase.from("task_assignments").insert([
    {
      task_id: taskId,
      assigned_to: userId,
      assigned_by: user?.id,
    },
  ]);

  return { error };
};
```

#### Görevleri Atamalarıyla Getirme

```typescript
const getTasksWithAssignments = async (projectId: string) => {
  const { data, error } = await supabase
    .from("tasks_with_assignments")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  return { data, error };
};
```

#### Gerçek Zamanlı Güncellemeler

```typescript
// 5 saniyelik polling sistemi
useEffect(() => {
  const interval = setInterval(async () => {
    if (user?.id) {
      await reloadTasks();
    }
  }, 5000);

  return () => clearInterval(interval);
}, [user?.id]);

// Görev detay paneli için 10 saniyelik polling
useEffect(() => {
  const interval = setInterval(async () => {
    if (selectedTask) {
      await loadTaskAssignments();
    }
  }, 10000);

  return () => clearInterval(interval);
}, [selectedTask]);
```

#### Silme İşlemleri

```typescript
// Organizasyon Silme (Custom Modal ile)
const deleteOrganization = async () => {
  setConfirmDialog({
    isOpen: true,
    title: "Organizasyonu Sil",
    message: `"${organization?.name}" organizasyonunu silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz ve tüm projeler, görevler ve veriler silinecektir.`,
    type: "danger",
    onConfirm: async () => {
      const { error } = await supabase
        .from("organizations")
        .delete()
        .eq("id", organizationId);

      if (!error) {
        router.push("/dashboard");
      }
    },
  });
};

// Proje Silme
const deleteProject = async (projectId: string, projectName: string) => {
  return new Promise((resolve) => {
    setConfirmDialog({
      isOpen: true,
      title: "Projeyi Sil",
      message: `"${projectName}" projesini silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz ve projeye ait tüm görevler de silinecektir.`,
      type: "danger",
      onConfirm: async () => {
        const { error } = await supabase
          .from("projects")
          .delete()
          .eq("id", projectId);

        resolve({ success: !error, error });
      },
    });
  });
};

// Görev Silme
const deleteTask = async (taskId: string, taskTitle: string) => {
  return new Promise((resolve) => {
    setConfirmDialog({
      isOpen: true,
      title: "Görevi Sil",
      message: `"${taskTitle}" görevini silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz.`,
      type: "danger",
      onConfirm: async () => {
        const { error } = await supabase
          .from("tasks")
          .delete()
          .eq("id", taskId);

        resolve({ success: !error, error });
      },
    });
  });
};
```

## 🔧 Supabase Fonksiyonları

### 1. Kullanıcı Profili Otomatik Oluşturma

Supabase Auth'da yeni kullanıcı oluştuğunda otomatik olarak `profiles` tablosuna kayıt eklenir:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Çalışma Prensibi:**

- `auth.users` tablosuna yeni kayıt eklendiğinde tetiklenir
- `raw_user_meta_data` JSON alanından `full_name` ve `avatar_url` çeker
- Conflict durumunda (dublicate) hiçbir şey yapmaz
- `SECURITY DEFINER` ile RLS bypass eder

### 2. Cascade Delete İşlemleri

Silme işlemleri otomatik olarak ilgili verileri de siler:

```sql
-- Organizasyon silindiğinde
organizations (DELETE)
  ↓ CASCADE
  ├── memberships (DELETE ALL)
  ├── projects (DELETE ALL)
  │   └── tasks (DELETE ALL)
  │       └── task_assignments (DELETE ALL)
  └── invitations (DELETE ALL)

-- Proje silindiğinde
projects (DELETE)
  ↓ CASCADE
  └── tasks (DELETE ALL)
      └── task_assignments (DELETE ALL)

-- Görev silindiğinde
tasks (DELETE)
  ↓ CASCADE
  └── task_assignments (DELETE ALL)

-- Kullanıcı silindiğinde
auth.users (DELETE)
  ↓ CASCADE
  ├── profiles (DELETE)
  ├── memberships (DELETE ALL)
  ├── organizations.created_by (SET NULL)
  ├── projects.created_by (SET NULL)
  ├── tasks.created_by (SET NULL)
  └── task_assignments.assigned_to (DELETE)
```

### 3. View: Tasks with Assignments

Görevleri atamalarıyla birlikte getiren performanslı view:

```sql
CREATE OR REPLACE VIEW public.tasks_with_assignments AS
SELECT
  t.*,
  COALESCE(
    json_agg(
      json_build_object(
        'user_id', ta.assigned_to,
        'full_name', p.full_name,
        'avatar_url', p.avatar_url,
        'assigned_at', ta.assigned_at,
        'assigned_by', ta.assigned_by
      ) ORDER BY ta.assigned_at
    ) FILTER (WHERE ta.assigned_to IS NOT NULL),
    '[]'::json
  ) AS assignments
FROM public.tasks t
LEFT JOIN public.task_assignments ta ON ta.task_id = t.id
LEFT JOIN public.profiles p ON p.id = ta.assigned_to
GROUP BY t.id;
```

**Avantajları:**

- Tek query ile görev + atamalar
- JSON formatında assignments array
- Avatar bilgileri dahil
- RLS policies view'da da geçerli

## 📚 Kullanım Kılavuzu

### 1. İlk Kurulum

1. **Kayıt Ol**: `/register` sayfasından hesap oluştur
2. **Email Doğrula**: Supabase'den gelen email'i doğrula (geliştirmede opsiyonel)
3. **Profil Tamamla**: Dashboard'da profil bilgilerini güncelle
4. **Organizasyon Oluştur**: İlk organizasyonunu oluştur (otomatik olarak owner rolü alırsın)

### 2. Takım Yönetimi

#### Üye Davet Etme

1. Organizasyon sayfasına git (`/organization/[id]`)
2. "Üye Davet Et" butonuna tıkla
3. Email adresi ve rol seç (Admin/Member)
4. Davet gönder

**Davet Süreci:**

- Sistem console'da davet linkini gösterir (gerçek projede email gönderilir)
- Davet 7 gün geçerlidir
- Davet edilen kişi kayıtlı değilse önce kayıt olmalıdır

#### Rol Yönetimi

- **Owner**: Tüm yetkiler, organizasyonu silebilir, tüm rolleri değiştirebilir
- **Admin**: Proje ve görev yönetimi, üye davet edebilir, member rollerini değiştirebilir
- **Member**: Sadece atandığı görevleri yönetebilir, görüntüleme yetkisi

**Rol Değiştirme Kuralları:**

- Owner hiç kimseyi owner yapamaz (organizasyonda tek owner)
- Admin, diğer adminlerin rolünü değiştiremez
- Admin, owner'ın rolünü değiştiremez
- Kimse kendi rolünü değiştiremez

### 3. Proje Yönetimi

#### Proje Oluşturma

1. Dashboard'da organizasyonunu seç
2. "Yeni Proje" butonuna tıkla
3. Proje adı ve açıklaması ekle
4. Proje otomatik olarak oluşturulur

#### Proje Görüntüleme

- Dashboard'da organizasyon bazlı gruplama
- Her proje kartında görev sayısı gösterilir
- Proje kartına tıklayarak Kanban board'a gidebilirsin

#### Proje Silme

- Sadece Admin ve Owner proje silebilir
- Silme butonu proje kartında hover yapınca görünür
- Custom modal ile onay istenir
- Tüm görevler ve atamalar otomatik silinir

### 4. Görev Yönetimi

#### Görev Oluşturma

1. Proje sayfasına git (`/project/[id]`)
2. "Yeni Görev Ekle" butonuna tıkla
3. Görev başlığı ve açıklaması ekle
4. Görev otomatik olarak "Bekliyor" sütununda oluşur

#### Görev Atama

1. Görev kartına tıklayarak detay panelini aç
2. Sağ panelde "Görev Ata" butonuna bas
3. Organizasyon üyelerinden seç
4. Aynı göreve birden fazla kişi atanabilir
5. Atamalar anında görünür (avatar'larla)

#### Görev Durumu Değiştirme

**Drag & Drop:**

- Görevleri sütunlar arasında sürükleyebilirsin
- Sadece yetkili kullanıcılar drag yapabilir
- Yetki kontrolü drag başlamadan önce yapılır
- Database'de gerçek atama durumu kontrol edilir

**Durum Butonları:**

- Görev kartındaki ok butonları ile durum değiştirebilirsin
- Her duruma özel ikon ve renk
- Loading state ile görsel feedback

**Yetki Kuralları:**

- **Admin/Owner**: Tüm görevleri yönetebilir
- **Assigned User**: Sadece kendine atanan görevleri yönetebilir
- **Non-assigned Member**: Hiçbir görev yönetemez

#### Görev Silme

- Sadece Admin ve Owner görev silebilir
- Silme butonu görev kartında hover yapınca görünür
- Custom modal ile onay istenir
- Tüm atamalar otomatik silinir

### 5. Gerçek Zamanlı Güncellemeler

#### Polling Sistemi

- **Ana sayfa**: 5 saniyede bir görev listesi güncellenir
- **Görev detay paneli**: 10 saniyede bir atama listesi güncellenir
- Arka planda çalışır, kullanıcı fark etmez

#### Otomatik Senkronizasyon

- Başka bir kullanıcı görev durumu değiştirirse otomatik yansır
- Görev atamaları anında görünür
- Yetki değişiklikleri otomatik uygulanır

#### Database Doğrulama

- Her drag işlemi database'de kontrol edilir
- Yetkisiz işlemler engellenir
- Sayfa otomatik yenilenir

### 6. Güvenlik Özellikleri

#### Veri İzolasyonu

- Her organizasyon tamamen izole
- Kullanıcılar sadece üye oldukları organizasyonları görebilir
- Cross-organization data leak'i imkansız

#### Yetki Kontrolleri

- Tüm işlemler database seviyesinde kontrol edilir
- Frontend kontrolleri bypass edilemez
- RLS policies her zaman aktif

#### Audit Trail

- Tüm görev atamaları kim tarafından yapıldığı kaydedilir
- Oluşturma ve güncelleme tarihleri takip edilir
- Organizasyon üyelik geçmişi korunur

## 🐛 Sorun Giderme

### Yaygın Sorunlar

#### 1. Supabase Bağlantı Hatası

```
Error: Invalid API key
```

**Çözüm**:

- `.env.local` dosyasındaki Supabase URL ve API key'i kontrol edin
- Supabase Dashboard'da Keys sekmesinden doğru key'leri kopyalayın
- Projeyi yeniden başlatın (`npm run dev`)

#### 2. RLS Policy Hatası

```
Error: new row violates row-level security policy
```

**Çözüm**:

- Kullanıcının işlem için gerekli yetkiye sahip olduğundan emin olun
- Supabase Dashboard > Authentication > Users'da kullanıcının auth durumunu kontrol edin
- Membership tablosunda kullanıcının doğru role sahip olduğunu kontrol edin

#### 3. Görev Atama Sorunu

```
Görev atanamıyor veya atama görünmüyor
```

**Çözüm**:

- Sayfa yenilenmesini bekleyin (5-10 saniye polling)
- Manuel yenileyin (F5)
- Browser console'da error mesajlarını kontrol edin
- Network sekmesinde API çağrılarını inceleyin

#### 4. Drag & Drop Çalışmıyor

```
Görevler sürüklenemiyor
```

**Çözüm**:

- Kullanıcının göreve atanmış olduğundan emin olun
- Admin/owner yetkisi olduğunu kontrol edin
- Database'de `task_assignments` tablosunda atama olduğunu kontrol edin
- Sayfa yenileyin

#### 5. Custom Modal Görünmüyor

```
Silme onayı çıkmıyor
```

**Çözüm**:

- Browser console'da JavaScript hataları kontrol edin
- CSS z-index konfliktleri olabilir
- Component state'lerini kontrol edin

### Debug İpuçları

#### Console Log Kontrolleri

```javascript
// Browser console'da Supabase client'ı kontrol et
console.log("Supabase URL:", supabase.supabaseUrl);
console.log("User:", await supabase.auth.getUser());

// Mevcut kullanıcının organizasyon üyeliklerini kontrol et
const { data } = await supabase
  .from("memberships")
  .select("*, organization:organizations(*)")
  .eq("user_id", user.id);
console.log("Memberships:", data);

// Görev atamalarını kontrol et
const { data: assignments } = await supabase
  .from("task_assignments")
  .select("*, profiles(*)")
  .eq("task_id", "task-uuid-here");
console.log("Task assignments:", assignments);
```

#### Network Tab İncelemesi

- Browser dev tools > Network sekmesi
- Supabase API çağrılarını izleyin
- 401/403 hataları yetki sorunları işaret eder
- 500 hataları database constraint ihlalleri olabilir

#### Database Console Kontrolleri

Supabase Dashboard > Table Editor'da:

```sql
-- Kullanıcının üyeliklerini kontrol et
SELECT m.*, o.name as org_name, p.full_name
FROM memberships m
JOIN organizations o ON o.id = m.organization_id
JOIN profiles p ON p.id = m.user_id
WHERE m.user_id = 'user-uuid-here';

-- Görev atamalarını kontrol et
SELECT ta.*, t.title, p.full_name
FROM task_assignments ta
JOIN tasks t ON t.id = ta.task_id
JOIN profiles p ON p.id = ta.assigned_to
WHERE ta.task_id = 'task-uuid-here';

-- RLS policy'lerin aktif olduğunu kontrol et
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

### Performance İpuçları

#### 1. Polling Optimizasyonu

```typescript
// Sayfa görünür değilse polling'i durdur
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.hidden) {
      clearInterval(pollingInterval);
    } else {
      startPolling();
    }
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);
  return () =>
    document.removeEventListener("visibilitychange", handleVisibilityChange);
}, []);
```

#### 2. Gereksiz Re-render'ları Önleme

```typescript
// useMemo ile expensive hesaplamaları cache'le
const tasksByStatus = useMemo(() => {
  return {
    todo: tasks.filter((task) => task.status === "todo"),
    in_progress: tasks.filter((task) => task.status === "in_progress"),
    done: tasks.filter((task) => task.status === "done"),
  };
}, [tasks]);

// useCallback ile function reference'larını stabil tut
const handleTaskUpdate = useCallback((taskId: string, updates: any) => {
  setTasks((prev) =>
    prev.map((task) => (task.id === taskId ? { ...task, ...updates } : task))
  );
}, []);
```

## 🚀 Production Deployment

### Environment Variables (Production)

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
```

### Supabase Production Ayarları

#### 1. Authentication

- **Site URL**: `https://your-domain.com`
- **Redirect URLs**: `https://your-domain.com/dashboard`
- **JWT expiry**: 3600 (1 saat)
- **Refresh token rotation**: Aktif

#### 2. Security

- **RLS policies**: Tümü aktif olmalı
- **API key'ler**: Production key'leri kullanın
- **CORS**: Sadece domain'inizi whitelist'e alın

#### 3. Performance

- **Connection pooling**: Aktif
- **Cache settings**: Optimize edin
- **Index'ler**: Sık kullanılan query'ler için

### Vercel Deployment

#### 1. Build ve Deploy

```bash
npm run build
vercel --prod
```

#### 2. Environment Variables (Vercel Dashboard)

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 3. Domain Configuration

- Custom domain ekleyin
- SSL sertifikası otomatik
- Supabase'de domain'i güncellemeyi unutmayın

### Monitoring ve Analytics

#### 1. Supabase Dashboard

- **Auth**: Kullanıcı giriş/çıkış istatistikleri
- **Database**: Query performance
- **Storage**: Dosya upload/download

#### 2. Vercel Analytics

- **Performance**: Core Web Vitals
- **Usage**: API çağrı sayıları
- **Errors**: Runtime hataları

## 📈 Gelecek Özellikler

### Kısa Vadeli (v1.1)

- [ ] Email notification sistemi
- [ ] Görev yorumları
- [ ] Dosya eklentileri
- [ ] Görev filtreleme ve arama
- [ ] Dashboard istatistikleri

### Orta Vadeli (v1.2)

- [ ] Supabase Realtime entegrasyonu
- [ ] Görev şablonları
- [ ] Zaman takibi
- [ ] Rapor sistemi
- [ ] Mobile uygulama (React Native)

### Uzun Vadeli (v2.0)

- [ ] AI destekli görev öneri sistemi
- [ ] Gantt chart görünümü
- [ ] API dokumentasyonu
- [ ] Webhook sistemi
- [ ] Third-party entegrasyonlar

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için `LICENSE` dosyasını inceleyebilirsiniz.

## 🤝 Katkıda Bulunma

1. **Fork** yapın
2. **Feature branch** oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi **commit** edin (`git commit -m 'Add amazing feature'`)
4. Branch'i **push** edin (`git push origin feature/amazing-feature`)
5. **Pull Request** açın

### Development Guidelines

- TypeScript strict mode kullanın
- ESLint rules'larını takip edin
- Component'lar için JSDoc yazın
- Database değişiklikleri için migration script'leri ekleyin

## 👥 Katkıda Bulunanlar

- **H. Semih Aktaş** - İlk geliştirme - [@hsemihaktas](https://github.com/hsemihaktas)

---

**TaskFlow** ile takım çalışmanızı organize edin! 🚀

![TaskFlow](https://img.shields.io/badge/TaskFlow-v1.0-brightgreen)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Supabase](https://img.shields.io/badge/Supabase-2.0-green)
![Tailwind](https://img.shields.io/badge/Tailwind-3.0-cyan)
