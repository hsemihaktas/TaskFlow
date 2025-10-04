"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Eğer kullanıcı zaten giriş yapmışsa dashboard'a yönlendir
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        router.push("/dashboard");
      }
    };

    checkUser();
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
            TaskFlow
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Görev ve proje yönetim sistemi
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href="/login"
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Giriş Yap
          </Link>

          <Link
            href="/register"
            className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Kayıt Ol
          </Link>
        </div>

        <div className="mt-8 p-6 bg-white rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Özellikler
          </h3>
          <div className="text-left space-y-2 text-sm text-gray-600">
            <p>✓ Organizasyon ve takım yönetimi</p>
            <p>✓ Proje takibi</p>
            <p>✓ Görev atama ve durumu</p>
            <p>✓ Güvenli kullanıcı yönetimi</p>
          </div>
        </div>
      </div>
    </div>
  );
}
