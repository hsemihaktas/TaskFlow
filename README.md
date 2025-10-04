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

4. **Veritabanı Şeması**

   Supabase SQL Editor'da verdiğiniz tabloları ve policy'leri oluşturun.

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
