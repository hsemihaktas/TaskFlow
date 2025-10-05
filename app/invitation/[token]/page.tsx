"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

interface Invitation {
  id: string;
  organization_id: string;
  email: string;
  role: string;
  invited_by: string;
  status: string;
  expires_at: string;
  organizations: {
    name: string;
  };
  profiles: {
    full_name: string;
  };
}

export default function InvitationPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [user, setUser] = useState<User | null>(null);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");

  // Daveti yükle
  const loadInvitation = async () => {
    try {
      // Invitation'ı getir
      const { data: invitations, error: invitationError } = await supabase
        .from("invitations")
        .select("*")
        .eq("token", token)
        .eq("status", "pending");

      const invitationData =
        invitations && invitations.length > 0 ? invitations[0] : null;

      if (invitationError) {
        console.error("Invitation sorgu hatası:", invitationError);
      }

      if (!invitationData) {
        setError("Davet bulunamadı veya süresi dolmuş.");
        return;
      }

      // Organization bilgisini ayrı getir
      const { data: orgData } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", invitationData.organization_id)
        .single();

      // Davet eden kişi bilgisini ayrı getir
      const { data: inviterData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", invitationData.invited_by)
        .single();

      // Join verilerini manuel olarak ekle
      const enrichedInvitation = {
        ...invitationData,
        organizations: { name: orgData?.name || "Organizasyon" },
        profiles: { full_name: inviterData?.full_name || "Bilinmeyen" },
      };

      if (invitationError || !invitationData) {
        setError("Davet bulunamadı veya süresi dolmuş.");
        return;
      }

      // Davet süresi dolmuş mu kontrol et
      const now = new Date();
      const expiresAt = new Date(enrichedInvitation.expires_at);

      if (now > expiresAt) {
        // Süresi dolmuş daveti güncelle
        await supabase
          .from("invitations")
          .update({ status: "expired" })
          .eq("id", enrichedInvitation.id);

        setError("Bu davet süresi dolmuş.");
        return;
      }

      setInvitation(enrichedInvitation);
    } catch (error) {
      console.error("Davet yükleme hatası:", error);
      setError("Davet yüklenirken bir hata oluştu.");
    }
  };

  // Daveti kabul et
  const acceptInvitation = async () => {
    if (!invitation || !user) return;

    setAccepting(true);

    try {
      // 1. Kullanıcı zaten üye mi kontrol et
      const { data: memberships } = await supabase
        .from("memberships")
        .select("id")
        .eq("organization_id", invitation.organization_id)
        .eq("user_id", user.id);

      const existingMembership =
        memberships && memberships.length > 0 ? memberships[0] : null;

      if (existingMembership) {
        setError("Bu organizasyona zaten üyesiniz.");
        setAccepting(false);
        return;
      }

      // 2. Kullanıcının e-postası davet edilen e-posta ile eşleşiyor mu
      if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
        setError(
          `Bu davet ${invitation.email} e-posta adresi içindir. Lütfen doğru hesapla giriş yapın.`
        );
        setAccepting(false);
        return;
      }

      // 3. Üyelik oluştur
      const { error: membershipError } = await supabase
        .from("memberships")
        .insert({
          user_id: user.id,
          organization_id: invitation.organization_id,
          role: invitation.role,
        });

      if (membershipError) {
        throw membershipError;
      }

      // 4. Daveti kabul edildi olarak işaretle
      const { error: updateError } = await supabase
        .from("invitations")
        .update({
          status: "accepted",
          updated_at: new Date().toISOString(),
        })
        .eq("id", invitation.id);

      if (updateError) {
        console.error("Davet güncelleme hatası:", updateError);
      }

      // 5. Organizasyon sayfasına yönlendir
      alert(
        `🎉 Tebrikler! ${invitation.organizations.name} organizasyonuna başarıyla katıldınız!`
      );
      router.push(`/organization/${invitation.organization_id}`);
    } catch (error: any) {
      console.error("Davet kabul etme hatası:", error);
      setError("Davet kabul edilirken bir hata oluştu: " + error.message);
    } finally {
      setAccepting(false);
    }
  };

  // Daveti reddet
  const declineInvitation = () => {
    router.push("/dashboard");
  };

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // Kullanıcı giriş yapmamış, login sayfasına yönlendir
        // Davet token'ını koruyarak
        router.push(`/login?redirect=/invitation/${token}`);
        return;
      }

      setUser(user);
      await loadInvitation();
      setLoading(false);
    };

    getUser();
  }, [token, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Davet kontrol ediliyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="text-center">
            <svg
              className="w-16 h-16 text-red-500 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <h1 className="text-xl font-bold text-gray-900 mb-4">
              Davet Geçersiz
            </h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-y-3">
              <button
                onClick={() => router.push("/dashboard")}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Dashboard'a Git
              </button>
              <button
                onClick={() => router.push("/login")}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Giriş Yap
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="text-center">
          {/* Organizasyon İkonu */}
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m4 0v-6a2 2 0 012-2h2a2 2 0 012 2v6"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Organizasyon Daveti
          </h1>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800 mb-2">
              <strong>
                {invitation.profiles?.full_name || "Bilinmeyen Kullanıcı"}
              </strong>{" "}
              sizi
            </p>
            <p className="text-lg font-semibold text-blue-900 mb-2">
              {invitation.organizations.name}
            </p>
            <p className="text-sm text-blue-800">
              organizasyonuna{" "}
              <strong>
                {invitation.role === "admin" ? "yönetici" : "üye"}
              </strong>{" "}
              olarak davet etti.
            </p>
          </div>

          <div className="text-sm text-gray-600 mb-6">
            <p className="mb-2">
              <strong>E-posta:</strong> {invitation.email}
            </p>
            <p className="mb-2">
              <strong>Rol:</strong>{" "}
              {invitation.role === "admin" ? "Yönetici" : "Üye"}
            </p>
            <p>
              <strong>Son Geçerlilik:</strong>{" "}
              {new Date(invitation.expires_at).toLocaleString("tr-TR")}
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={acceptInvitation}
              disabled={accepting}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {accepting ? "Kabul Ediliyor..." : "🎉 Daveti Kabul Et"}
            </button>

            <button
              onClick={declineInvitation}
              disabled={accepting}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Reddet
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            Bu davet sadece {invitation.email} e-posta adresi için geçerlidir.
          </p>
        </div>
      </div>
    </div>
  );
}
