"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";
import { Profile } from "@/types";
import { create } from "domain";

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Form verileri
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const router = useRouter();

  useEffect(() => {
    getUser();

    // Auth state değişikliklerini dinle
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        router.push("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // Profile verisi geldiğinde form verilerini güncelle - KALDIRILDI
  // Artık getUser fonksiyonunda direkt olarak set ediyoruz

  const getUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUser(user);

      // Kullanıcı profilini getir
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Profil getirilirken hata:", error);
        // Hata varsa boş profil oluştur
        const emptyProfile = {
          id: user.id,
          full_name: "",
          phone: "",
          position: "",
          avatar_url: "",
          created_at: "",
        };
        setProfile(emptyProfile);
        setFullName("");
        setPhone("");
        setPosition("");
        setAvatarUrl("");
      } else if (profile) {
        setProfile(profile);
        // Form verilerini hemen güncelle
        setFullName(profile.full_name || "");
        setPhone(profile.phone || "");
        setPosition(profile.position || "");
        setAvatarUrl(profile.avatar_url || "");
      } else {
        // Profil yoksa boş profil oluştur
        const emptyProfile = {
          id: user.id,
          full_name: "",
          avatar_url: "",
          created_at: "",
        };
        setProfile(emptyProfile);
        if (user?.email) {
          const emailUsername = user.email.split("@")[0];
          const suggestedName = emailUsername
            .replace(/[._-]/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase());
          setFullName(suggestedName);
        } else {
          setFullName("");
        }
        setAvatarUrl("");
      }
    } catch (err) {
      console.error("Kullanıcı bilgileri getirilirken hata:", err);
    } finally {
      setLoading(false);
    }
  };

  // Resmi küçültme fonksiyonu
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        // Maksimum boyut 300x300
        const maxSize = 300;
        let { width, height } = img;

        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            }
          },
          "image/jpeg",
          0.8 // Kalite %80
        );
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      setError("");

      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      let file = event.target.files[0];

      // Dosya türü kontrolü
      if (!file.type.startsWith("image/")) {
        setError("Lütfen geçerli bir resim dosyası seçin.");
        return;
      }

      // Resmi sıkıştır
      file = await compressImage(file);

      const fileExt = file.name.split(".").pop();
      const fileName = `${user?.id}/avatar-${Date.now()}.${fileExt}`;

      // Kullanıcının eski avatar dosyalarını temizle
      if (user?.id) {
        try {
          // Kullanıcının klasöründeki tüm dosyaları listele
          const { data: existingFiles } = await supabase.storage
            .from("avatars")
            .list(user.id);

          if (existingFiles && existingFiles.length > 0) {
            // Tüm eski dosyaları sil
            const filesToDelete = existingFiles.map(
              (file) => `${user.id}/${file.name}`
            );

            const { error: deleteError } = await supabase.storage
              .from("avatars")
              .remove(filesToDelete);

            if (deleteError) {
              console.warn("Eski dosyalar silinemedi:", deleteError);
            }
          }
        } catch (deleteErr) {
          console.warn("Eski dosya temizleme hatası:", deleteErr);
        }
      }

      // Dosyayı Supabase Storage'a yükle
      const { data, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file);

      if (uploadError) {
        throw uploadError;
      }

      // Public URL'i al
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(fileName);

      setAvatarUrl(publicUrl);
      setMessage(
        "Resim başarıyla yüklendi! Profili güncellemek için 'Değişiklikleri Kaydet' butonuna basın."
      );
    } catch (error: unknown) {
      setError(
        "Resim yüklenirken hata oluştu: " +
          (error instanceof Error ? error.message : "Bilinmeyen hata")
      );
    } finally {
      setUploading(false);
    }
  };

  const updateProfile = async () => {
    try {
      setSaving(true);
      setError("");
      setMessage("");

      if (!user) return;

      // Basit validasyon
      if (!fullName.trim()) {
        setError("Lütfen adınızı ve soyadınızı girin.");
        return;
      }

      if (fullName.trim().length < 2) {
        setError("Ad soyad en az 2 karakter olmalıdır.");
        return;
      }

      // Telefon validasyonu (opsiyonel ama format kontrolü)
      if (phone.trim() && !/^[\+\d\s\-\(\)]+$/.test(phone.trim())) {
        setError("Geçersiz telefon numarası formatı.");
        return;
      }

      const updates = {
        id: user.id,
        full_name: fullName.trim(),
        phone: phone.trim(),
        position: position.trim(),
        avatar_url: avatarUrl,
      };

      const { error } = await supabase.from("profiles").upsert(updates);

      if (error) {
        console.error("Profil güncellenirken hata:", error);
        console.error("Gönderilen veri:", updates);
        setError(
          `Profil güncellenirken hata: ${
            error.message || error.details || JSON.stringify(error)
          }`
        );
        return;
      }

      setMessage("Profil başarıyla güncellendi!");

      // Profil verisini güncelle
      setProfile({
        ...profile,
        ...updates,
        created_at: profile?.created_at ?? "",
      });

      // Mesajı 3 saniye sonra temizle
      setTimeout(() => setMessage(""), 3000);
    } catch (error: unknown) {
      setError(
        "Profil güncellenirken hata oluştu: " +
          (error instanceof Error ? error.message : "Bilinmeyen hata")
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} profile={profile} />

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Başlık */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Ayarlar</h1>
            <p className="mt-1 text-sm text-gray-600">
              Profil bilgilerinizi yönetin ve hesap ayarlarınızı düzenleyin.
            </p>
          </div>

          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Profil Bilgileri
              </h2>
            </div>

            <div className="px-6 py-4">
              {/* Mesajlar */}
              {message && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-green-800">{message}</p>
                </div>
              )}

              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              <div className="space-y-6">
                {/* Avatar */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profil Fotoğrafı
                  </label>
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt="Avatar"
                          className="w-20 h-20 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-gray-300 flex items-center justify-center">
                          <svg
                            className="w-8 h-8 text-gray-500"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div>
                      <input
                        type="file"
                        id="avatar"
                        accept="image/*"
                        onChange={uploadAvatar}
                        disabled={uploading}
                        className="hidden"
                      />
                      <label
                        htmlFor="avatar"
                        className={`cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                          uploading ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      >
                        {uploading ? "Yükleniyor..." : "Fotoğraf Seç"}
                      </label>
                    </div>
                  </div>
                </div>

                {/* Ad Soyad */}
                <div>
                  <label
                    htmlFor="fullName"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Ad Soyad
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white placeholder-gray-500"
                    placeholder="Adınızı ve soyadınızı girin"
                  />
                </div>

                {/* Telefon */}
                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Telefon Numarası
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white placeholder-gray-500"
                    placeholder="Telefon numaranızı girin (örn: +90 555 123 45 67)"
                  />
                </div>

                {/* Meslek */}
                <div>
                  <label
                    htmlFor="position"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Meslek / Pozisyon
                  </label>
                  <input
                    type="text"
                    id="position"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white placeholder-gray-500"
                    placeholder="Mesleğinizi veya pozisyonunuzu girin (örn: Yazılım Geliştirici)"
                  />
                </div>

                {/* Email (sadece görüntüleme) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Adresi
                  </label>
                  <input
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Email adresiniz değiştirilemez.
                  </p>
                </div>

                {/* Kaydet Butonu */}
                <div className="flex justify-end">
                  <button
                    onClick={updateProfile}
                    disabled={saving}
                    className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Hesap Bilgileri */}
          <div className="mt-8 bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Hesap Bilgileri
              </h2>
            </div>

            <div className="px-6 py-4">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Hesap Oluşturulma Tarihi
                    </p>
                    <p className="text-sm text-gray-500">
                      {user?.created_at
                        ? new Date(user.created_at).toLocaleDateString("tr-TR")
                        : "Bilinmiyor"}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Son Giriş
                    </p>
                    <p className="text-sm text-gray-500">
                      {user?.last_sign_in_at
                        ? new Date(user.last_sign_in_at).toLocaleDateString(
                            "tr-TR",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )
                        : "Bilinmiyor"}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Kullanıcı ID
                    </p>
                    <p className="text-sm text-gray-500 font-mono">
                      {user?.id}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
