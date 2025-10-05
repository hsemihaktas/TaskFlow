"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";
import InviteMemberModal from "@/components/organization/InviteMemberModal";

interface Organization {
  id: string;
  name: string;
  created_at: string;
  created_by: string;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  profiles: {
    full_name: string;
    avatar_url: string;
  };
}

interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
  created_by: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  project_id: string;
  created_at: string;
}

export default function OrganizationPage() {
  const params = useParams();
  const router = useRouter();
  const organizationId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Organizasyon verilerini yükle
  const loadOrganizationData = async (userId: string) => {
    try {
      // Organizasyon bilgilerini getir
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", organizationId)
        .single();

      if (orgError) {
        console.error("Organizasyon bulunamadı:", orgError);
        router.push("/dashboard");
        return;
      }

      setOrganization(orgData);

      // Kullanıcının bu organizasyondaki rolünü kontrol et
      const { data: membershipData, error: membershipError } = await supabase
        .from("memberships")
        .select("role")
        .eq("user_id", userId)
        .eq("organization_id", organizationId)
        .single();

      if (membershipError) {
        console.error("Üyelik bulunamadı:", membershipError);
        router.push("/dashboard");
        return;
      }

      setUserRole(membershipData.role);

      // Organizasyon üyelerini getir (RLS sorunu nedeniyle ayrı sorgular)
      const { data: membersData, error: membersError } = await supabase
        .from("memberships")
        .select("*")
        .eq("organization_id", organizationId);

      if (!membersError && membersData) {
        // Her üye için profil bilgilerini ayrı olarak getir
        const membersWithProfiles = await Promise.all(
          membersData.map(async (membership) => {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("full_name, avatar_url")
              .eq("id", membership.user_id)
              .single();

            return {
              ...membership,
              profiles: profileData || {
                full_name: "Bilinmeyen Kullanıcı",
                avatar_url: null,
              },
            };
          })
        );

        setMembers(membersWithProfiles);
      } else {
        console.error("Üyeler getirilemedi:", membersError);
        setMembers([]);
      }

      // Organizasyon projelerini getir
      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .eq("organization_id", organizationId);

      if (!projectsError) {
        setProjects(projectsData || []);

        // Projelerin görevlerini getir
        if (projectsData && projectsData.length > 0) {
          const projectIds = projectsData.map((p) => p.id);

          const { data: tasksData, error: tasksError } = await supabase
            .from("tasks")
            .select("*")
            .in("project_id", projectIds);

          if (!tasksError) {
            setTasks(tasksData || []);
          }
        }
      }
    } catch (error) {
      console.error("Veri yükleme hatası:", error);
    }
  };

  // Görevleri projeye göre grupla
  const groupTasksByProject = () => {
    const grouped: { [key: string]: { project: Project; tasks: Task[] } } = {};

    projects.forEach((project) => {
      grouped[project.id] = {
        project: project,
        tasks: tasks.filter((task) => task.project_id === project.id),
      };
    });

    return Object.values(grouped);
  };

  // Rol bazlı yetki kontrolü
  const canInviteMembers = () => {
    return userRole === "owner" || userRole === "admin";
  };

  const canManageProjects = () => {
    return userRole === "owner" || userRole === "admin";
  };

  // Üye davet et
  const inviteMember = async (email: string, role: string) => {
    try {
      const normalizedEmail = email.toLowerCase().trim();

      // 1. E-posta ile kayıtlı kullanıcı var mı kontrol et
      // Email ile kullanıcı kontrolü

      let userExists = false;
      let userData: any = null;

      try {
        // Kullanıcı arama işlemi başlatılıyor        // Önce profiles tablosundan email ile kontrol et
        const { data: profileUser, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("email", normalizedEmail)
          .single();

        if (profileUser && !profileError) {
          userExists = true;
          userData = profileUser;
          console.log("✅ Kullanıcı sistemde kayıtlı:", userData.full_name);
        } else {
          console.log(
            "ℹ️ Kullanıcı sistemde kayıtlı değil, yeni davet oluşturuluyor"
          );
        }
      } catch (error) {
        console.error("❌ Kullanıcı kontrol hatası:", error);
        userExists = false;
        userData = null;
      }

      // 2. Kullanıcı zaten organizasyonda üye mi kontrol et
      if (userExists && userData) {
        console.log("Üyelik kontrol ediliyor...");

        try {
          const { data: memberships, error: membershipError } = await supabase
            .from("memberships")
            .select("id, role")
            .eq("organization_id", organizationId)
            .eq("user_id", userData.id);

          const existingMembership =
            memberships && memberships.length > 0 ? memberships[0] : null;

          if (membershipError) {
            console.log("Memberships sorgu hatası:", membershipError);
          } else if (existingMembership) {
            console.log("⚠️ Kullanıcı zaten organizasyonda üye");
            return {
              success: false,
              error: `${normalizedEmail} zaten bu organizasyonda ${
                existingMembership.role === "owner"
                  ? "sahip"
                  : existingMembership.role === "admin"
                  ? "yönetici"
                  : "üye"
              } olarak bulunuyor.`,
            };
          }
        } catch (error) {
          console.log("Üyelik kontrolünde hata, devam ediliyor:", error);
        }
      }

      // 3. Daha önce aynı e-posta ile bekleyen davet var mı kontrol et
      try {
        const { data: invitations, error: invitationError } = await supabase
          .from("invitations")
          .select("id, status, expires_at")
          .eq("organization_id", organizationId)
          .eq("email", normalizedEmail)
          .eq("status", "pending");

        const existingInvitation =
          invitations && invitations.length > 0 ? invitations[0] : null;

        if (invitationError) {
          console.log("Invitations sorgu hatası:", invitationError);
        } else if (existingInvitation) {
          // Davet süresi dolmuş mu kontrol et
          const now = new Date();
          const expiresAt = new Date(existingInvitation.expires_at);

          if (now < expiresAt) {
            return {
              success: false,
              error: `${normalizedEmail} adresine zaten aktif bir davet gönderilmiş. Davet ${expiresAt.toLocaleDateString(
                "tr-TR"
              )} tarihine kadar geçerli.`,
            };
          } else {
            // Süresi dolmuş daveti sil
            await supabase
              .from("invitations")
              .delete()
              .eq("id", existingInvitation.id);
          }
        }
      } catch (error) {
        console.log("Davet kontrolünde hata, devam ediliyor:", error);
      }

      // 4. Yeni davet oluştur
      const { data: invitation, error: invitationError } = await supabase
        .from("invitations")
        .insert({
          organization_id: organizationId,
          email: normalizedEmail,
          role: role,
          invited_by: user?.id,
        })
        .select("id, token, expires_at")
        .single();

      if (invitationError) {
        throw invitationError;
      }

      // 5. E-posta gönderme simulasyonu (gerçek projede SMTP servis kullanılmalı)
      console.log("=== DAVETİYE E-POSTASI ===");
      console.log(`Kime: ${normalizedEmail}`);
      console.log(`Organizasyon: ${organization?.name}`);
      console.log(`Rol: ${role === "admin" ? "Yönetici" : "Üye"}`);
      console.log(`Davet Eden: ${profile?.full_name || user?.email}`);
      console.log(
        `Davet Linki: ${window.location.origin}/invitation/${invitation.token}`
      );
      console.log(
        `Son Geçerlilik: ${new Date(invitation.expires_at).toLocaleString(
          "tr-TR"
        )}`
      );
      console.log("========================");

      // 6. Başarı mesajı
      const userStatus =
        userExists && userData
          ? `${
              userData.full_name || normalizedEmail
            } (${normalizedEmail}) sistemde kayıtlı kullanıcı, davet gönderildi.`
          : `${normalizedEmail} henüz sistemde kayıtlı değil. Kayıt olması için davet gönderildi.`;

      console.log("Davet başarıyla oluşturuldu:", invitation);
      alert(
        `✅ Davet başarıyla gönderildi!\n\n${userStatus}\n\nDavet 7 gün boyunca geçerli olacak.`
      );

      setShowInviteModal(false);

      // Üye listesini yenile (eğer kullanıcı zaten kayıtlı ise)
      if (user?.id) {
        await loadOrganizationData(user.id);
      }

      return { success: true };
    } catch (error: any) {
      console.error("Davet gönderme hatası:", error);

      let errorMessage = "Davet gönderilirken bir hata oluştu.";

      if (error.code === "23505") {
        // Unique constraint violation
        errorMessage = "Bu e-posta adresine zaten bir davet gönderilmiş.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      return { success: false, error: errorMessage };
    }
  };

  useEffect(() => {
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

      if (!error && profile) {
        setProfile(profile);
      }

      // Organizasyon verilerini yükle
      await loadOrganizationData(user.id);
      setLoading(false);
    };

    getUser();
  }, [organizationId, router]);

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

  if (!organization) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Organizasyon Bulunamadı
          </h1>
          <button
            onClick={() => router.push("/dashboard")}
            className="text-blue-600 hover:text-blue-800"
          >
            Dashboard'a Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} profile={profile} />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-8">
          {/* Organizasyon Başlığı */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
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
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {organization.name}
                  </h1>
                  <p className="text-gray-600">
                    Oluşturuldu:{" "}
                    {new Date(organization.created_at).toLocaleDateString(
                      "tr-TR"
                    )}
                  </p>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      userRole === "owner"
                        ? "bg-red-100 text-red-800"
                        : userRole === "admin"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {userRole === "owner"
                      ? "Sahip"
                      : userRole === "admin"
                      ? "Yönetici"
                      : "Üye"}
                  </span>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                  </svg>
                  Dashboard'a Dön
                </button>
                {canInviteMembers() && (
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    Üye Davet Et
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* İstatistikler */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-5.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Üye Sayısı
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {members.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Proje Sayısı
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {projects.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Görev Sayısı
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {tasks.length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Üyeler */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Organizasyon Üyeleri
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center space-x-3 p-4 border rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      {member.profiles?.avatar_url ? (
                        <img
                          src={member.profiles.avatar_url}
                          alt="Avatar"
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-600 font-medium">
                          {member.profiles?.full_name?.charAt(0) || "?"}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {member.profiles?.full_name || "İsimsiz Kullanıcı"}
                      </p>
                      <p
                        className={`text-xs ${
                          member.role === "owner"
                            ? "text-red-600"
                            : member.role === "admin"
                            ? "text-blue-600"
                            : "text-gray-600"
                        }`}
                      >
                        {member.role === "owner"
                          ? "Sahip"
                          : member.role === "admin"
                          ? "Yönetici"
                          : "Üye"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Projeler ve Görevler */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Projeler ve Görevler
              </h2>
            </div>
            <div className="p-6">
              {projects.length === 0 ? (
                <div className="text-center py-8">
                  <svg
                    className="w-16 h-16 text-gray-400 mx-auto mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Henüz proje yok
                  </h3>
                  <p className="text-gray-600">
                    Bu organizasyonda henüz proje oluşturulmamış.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {groupTasksByProject().map((group) => (
                    <div
                      key={group.project.id}
                      className="border border-gray-200 rounded-lg overflow-hidden"
                    >
                      {/* Proje Başlığı */}
                      <div className="bg-gradient-to-r from-green-50 to-blue-50 px-4 py-3 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
                              <svg
                                className="w-4 h-4 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                />
                              </svg>
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">
                                {group.project.name}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {group.tasks.length} görev
                              </p>
                            </div>
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(
                              group.project.created_at
                            ).toLocaleDateString("tr-TR")}
                          </div>
                        </div>
                        {group.project.description && (
                          <p className="mt-2 text-sm text-gray-700">
                            {group.project.description}
                          </p>
                        )}
                      </div>

                      {/* Görevler */}
                      <div className="p-4">
                        {group.tasks.length === 0 ? (
                          <p className="text-center text-gray-500 py-4">
                            Bu projede henüz görev yok
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {group.tasks.map((task) => (
                              <div
                                key={task.id}
                                className="group bg-white border-2 border-gray-200 rounded-lg p-3 hover:border-purple-300 hover:shadow-md transition-all duration-200"
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <h5 className="font-medium text-gray-900 group-hover:text-purple-700 transition-colors">
                                    {task.title}
                                  </h5>
                                  <div className="ml-2">
                                    {task.status === "done" ? (
                                      <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                                        <svg
                                          className="w-3 h-3 text-green-600"
                                          fill="currentColor"
                                          viewBox="0 0 20 20"
                                        >
                                          <path
                                            fillRule="evenodd"
                                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                            clipRule="evenodd"
                                          />
                                        </svg>
                                      </div>
                                    ) : task.status === "in_progress" ? (
                                      <div className="w-5 h-5 bg-yellow-100 rounded-full flex items-center justify-center">
                                        <svg
                                          className="w-3 h-3 text-yellow-600"
                                          fill="currentColor"
                                          viewBox="0 0 20 20"
                                        >
                                          <path
                                            fillRule="evenodd"
                                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                                            clipRule="evenodd"
                                          />
                                        </svg>
                                      </div>
                                    ) : (
                                      <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center">
                                        <svg
                                          className="w-3 h-3 text-gray-400"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                          />
                                        </svg>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <p className="text-xs text-gray-600 mb-3">
                                  {task.description || "Açıklama yok"}
                                </p>

                                <div className="flex items-center justify-between">
                                  <span
                                    className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                                      task.status === "done"
                                        ? "bg-green-100 text-green-800"
                                        : task.status === "in_progress"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-gray-100 text-gray-800"
                                    }`}
                                  >
                                    {task.status === "todo"
                                      ? "Yapılacak"
                                      : task.status === "in_progress"
                                      ? "Devam Ediyor"
                                      : "Tamamlandı"}
                                  </span>
                                  <span className="text-xs text-gray-400">
                                    {new Date(
                                      task.created_at
                                    ).toLocaleDateString("tr-TR")}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Üye Davet Et Modalı */}
      {showInviteModal && (
        <InviteMemberModal
          onClose={() => setShowInviteModal(false)}
          onInvite={inviteMember}
        />
      )}
    </div>
  );
}
