"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Kullanıcı oturumunu kontrol et
    const getUser = async () => {
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
        setProfile({ id: user.id, full_name: "", avatar_url: "" });
      } else if (profile) {
        setProfile(profile);
      } else {
        // Profil yoksa boş profil oluştur
        setProfile({ id: user.id, full_name: "", avatar_url: "" });
      }

      setLoading(false);
    };

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

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Dashboard
              </h2>
              <p className="text-gray-600 mb-6">
                Başarıyla giriş yaptınız! Burada organizasyonlarınızı,
                projelerinizi ve görevlerinizi yönetebileceksiniz.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Organizasyonlar
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Şirket ve ekiplerinizi yönetin
                  </p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Projeler
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Projelerinizi takip edin
                  </p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Görevler
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Görevlerinizi organize edin
                  </p>
                </div>
              </div>

              {user && (
                <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">
                    Kullanıcı Bilgileri:
                  </h4>
                  <p className="text-blue-800 text-sm">Email: {user.email}</p>
                  <p className="text-blue-800 text-sm">ID: {user.id}</p>
                  {profile && (
                    <p className="text-blue-800 text-sm">
                      Ad Soyad: {profile.full_name}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
