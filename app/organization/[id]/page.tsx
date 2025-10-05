"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";
import InviteMemberModal from "@/components/organization/InviteMemberModal";
import MemberManagementModal from "@/components/dashboard/MemberManagementModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Organization, Project, Task, Membership, Profile } from "@/types";

interface Member extends Membership {
  profiles: Profile;
}

export default function OrganizationPage() {
  const params = useParams();
  const router = useRouter();
  const organizationId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [updatingMember, setUpdatingMember] = useState<string | null>(null);
  const [deletingOrganization, setDeletingOrganization] = useState(false);

  // Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: "danger" | "warning" | "info";
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    type: "danger",
  });

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
        // Önce profiles tablosundan email ile kontrol et - .single() kullanmayarak 406 hatasını önleyelim
        const { data: profileUsers, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("email", normalizedEmail);

        if (profileError) {
          // Gerçek bir sorgu hatası
          throw profileError;
        } else if (profileUsers && profileUsers.length > 0) {
          // Kullanıcı bulundu
          userExists = true;
          userData = profileUsers[0];
        } else {
          // Kullanıcı bulunamadı - bu normal bir durum
          userExists = false;
          userData = null;
        }
      } catch (error) {
        // Sadece gerçek hataları logla
        console.error("❌ Kullanıcı kontrol hatası:", error);
        userExists = false;
        userData = null;
      }

      // 2. Kullanıcı zaten organizasyonda üye mi kontrol et
      if (userExists && userData) {
        try {
          const { data: memberships, error: membershipError } = await supabase
            .from("memberships")
            .select("id, role")
            .eq("organization_id", organizationId)
            .eq("user_id", userData.id);

          const existingMembership =
            memberships && memberships.length > 0 ? memberships[0] : null;

          if (membershipError) {
          } else if (existingMembership) {
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
          // Hata durumunda devam et
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
          // Invitation kontrolünde hata
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
        // Davet kontrol hatası
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

      // 6. Başarı - davet linkini oluştur ve döndür
      const inviteLink = `${window.location.origin}/invitation/${invitation.token}`;

      // Üye listesini yenile (eğer kullanıcı zaten kayıtlı ise)
      if (user?.id) {
        await loadOrganizationData(user.id);
      }

      return { 
        success: true, 
        inviteLink: inviteLink,
        userExists: userExists,
        userName: userData?.full_name || ""
      };
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

  // Üye rolünü güncelle
  const updateMemberRole = async (memberId: string, newRole: string) => {
    if (!canUpdateMemberRole(memberId, newRole)) {
      alert("Bu işlem için yetkiniz bulunmamaktadır.");
      return;
    }

    setUpdatingMember(memberId);

    try {
      const { error } = await supabase
        .from("memberships")
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq("id", memberId);

      if (error) {
        throw error;
      }

      // Üye listesini yenile
      if (user?.id) {
        await loadOrganizationData(user.id);
      }

      alert(
        `Üye rolü başarıyla ${
          newRole === "owner"
            ? "Sahip"
            : newRole === "admin"
            ? "Yönetici"
            : "Üye"
        } olarak güncellendi.`
      );
    } catch (error) {
      console.error("Rol güncelleme hatası:", error);
      alert("Rol güncellenirken bir hata oluştu.");
    } finally {
      setUpdatingMember(null);
    }
  };

  // Rol güncelleme yetkisi kontrolü
  const canUpdateMemberRole = (memberId: string, newRole: string) => {
    const targetMember = members.find((m) => m.id === memberId);
    if (!targetMember) return false;

    // Sadece owner ve admin rol değiştirebilir
    if (userRole !== "owner" && userRole !== "admin") return false;

    // Admin, başka admin'lerin rolünü değiştiremez
    if (userRole === "admin" && targetMember.role === "admin") return false;

    // Admin, owner'ın rolünü değiştiremez
    if (userRole === "admin" && targetMember.role === "owner") return false;

    // Admin, birini owner yapamaz
    if (userRole === "admin" && newRole === "owner") return false;

    // Hiç kimse (owner dahil) başka birini owner yapamaz - organizasyonda sadece bir owner olmalı
    if (newRole === "owner") return false;

    // Kullanıcı kendi rolünü değiştiremez
    if (targetMember.user_id === user?.id) return false;

    return true;
  };

  // Organization silme (sadece owner)
  const deleteOrganization = async () => {
    if (userRole !== "owner") {
      alert("Sadece organizasyon sahibi organizasyonu silebilir.");
      return;
    }

    // Confirm dialog göster
    setConfirmDialog({
      isOpen: true,
      title: "Organizasyonu Sil",
      message: `"${organization?.name}" organizasyonunu silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz ve tüm projeler, görevler ve veriler silinecektir.`,
      type: "danger",
      onConfirm: performDeleteOrganization,
    });
  };

  // Gerçek silme işlemi
  const performDeleteOrganization = async () => {
    setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
    setDeletingOrganization(true);

    try {
      const { error } = await supabase
        .from("organizations")
        .delete()
        .eq("id", organizationId);

      if (error) {
        throw error;
      }

      // Başarı mesajı için yeni dialog
      setConfirmDialog({
        isOpen: true,
        title: "Başarılı",
        message: "Organizasyon başarıyla silindi.",
        type: "info",
        onConfirm: () => {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          router.push("/dashboard");
        },
      });
    } catch (error: any) {
      console.error("Organizasyon silme hatası:", error);

      // Hata mesajı için dialog
      setConfirmDialog({
        isOpen: true,
        title: "Hata",
        message: `Organizasyon silinirken bir hata oluştu:\n${error.message}`,
        type: "danger",
        onConfirm: () =>
          setConfirmDialog((prev) => ({ ...prev, isOpen: false })),
      });
    } finally {
      setDeletingOrganization(false);
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
                {userRole === "owner" && (
                  <button
                    onClick={deleteOrganization}
                    disabled={deletingOrganization}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    {deletingOrganization
                      ? "Siliniyor..."
                      : "Organizasyonu Sil"}
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
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">
                Organizasyon Üyeleri
              </h2>
              {(userRole === "owner" || userRole === "admin") && (
                <button
                  onClick={() => setShowMembersModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  Tümünü Gör
                </button>
              )}
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
                      {/* Proje Başlığı - Tıklanabilir */}
                      <div
                        className="bg-gradient-to-r from-green-50 to-blue-50 px-4 py-3 border-b border-gray-200 cursor-pointer hover:from-green-100 hover:to-blue-100 transition-colors"
                        onClick={() =>
                          router.push(`/project/${group.project.id}`)
                        }
                      >
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
                              <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                                {group.project.name}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {group.tasks.length} görev
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="text-sm text-gray-500">
                              {new Date(
                                group.project.created_at
                              ).toLocaleDateString("tr-TR")}
                            </div>
                            <svg
                              className="w-4 h-4 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </div>
                        </div>
                        {group.project.description && (
                          <p className="mt-2 text-sm text-gray-700">
                            {group.project.description}
                          </p>
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
          organizationName={organization?.name}
        />
      )}

      {/* Üye Yönetimi Modalı */}
      {showMembersModal && (
        <MemberManagementModal
          members={members}
          currentUserRole={userRole}
          currentUserId={user?.id}
          onClose={() => setShowMembersModal(false)}
          onUpdateRole={updateMemberRole}
          updatingMember={updatingMember}
        />
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        confirmText="Sil"
        cancelText="İptal"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() =>
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
        }
      />
    </div>
  );
}
