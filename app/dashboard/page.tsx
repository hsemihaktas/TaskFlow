"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";
import CreateOrganizationModal from "@/components/dashboard/CreateOrganizationModal";
import CreateProjectModal from "@/components/dashboard/CreateProjectModal";
import CreateTaskModal from "@/components/dashboard/CreateTaskModal";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const router = useRouter();

  // Projeleri organizasyona göre grupla
  const groupProjectsByOrganization = () => {
    const grouped: { [key: string]: { organization: any; projects: any[] } } = {};
    
    projects.forEach(project => {
      const orgId = project.organization_id;
      
      // Organizasyon bilgisini organizations array'inden bul
      const organization = organizations.find(org => org.id === orgId);
      
      if (!grouped[orgId]) {
        grouped[orgId] = {
          organization: organization || { id: orgId, name: "Bilinmeyen Organizasyon" },
          projects: []
        };
      }
      grouped[orgId].projects.push(project);
    });
    
    return Object.values(grouped);
  };

  // Kullanıcının verilerini yükle
  const loadUserData = async (userId: string) => {
    try {
      // Önce tabloların varlığını test et
      console.log("Tabloları kontrol ediyor...");

      // Basit bir test query'si
      const { data: testData, error: testError } = await supabase
        .from("organizations")
        .select("count")
        .limit(1);

      if (testError) {
        console.error("Organizations tablosu bulunamadı:", testError);
        setOrganizations([]);
        return;
      }

      // Kullanıcının üyesi olduğu organizasyonları getir
      const { data: userOrgs, error: orgsError } = await supabase
        .from("memberships")
        .select(
          `
          organizations (
            id,
            name,
            created_at
          )
        `
        )
        .eq("user_id", userId);

      if (orgsError) {
        console.error("Organizasyonlar yüklenirken hata:", orgsError);
        console.error("Hata detayı:", {
          message: orgsError.message,
          details: orgsError.details,
          hint: orgsError.hint,
          code: orgsError.code,
        });
        // Hata durumunda boş array set et
        setOrganizations([]);
      } else {
        const organizations =
          userOrgs?.map((item: any) => item.organizations) || [];
        setOrganizations(organizations);

        // Eğer organizasyon varsa, projelerini de getir
        if (organizations.length > 0) {
          await loadProjectsAndTasks(organizations.map((org: any) => org.id));
        }
      }
    } catch (error) {
      console.error("Veri yükleme hatası:", error);
    }
  };

  // Projeleri ve görevleri yükle
  const loadProjectsAndTasks = async (organizationIds: string[]) => {
    try {
      // Projeleri getir (organizasyon bilgisi manuel olarak eşleştirilecek)
      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .in("organization_id", organizationIds);

      if (projectsError) {
        console.error("Projeler yüklenirken hata:", projectsError);
      } else {
        setProjects(projectsData || []);

        // Eğer proje varsa, görevleri de getir
        if (projectsData && projectsData.length > 0) {
          const projectIds = projectsData.map((project: any) => project.id);

          const { data: tasksData, error: tasksError } = await supabase
            .from("tasks")
            .select("*")
            .in("project_id", projectIds);

          if (tasksError) {
            console.error("Görevler yüklenirken hata:", tasksError);
          } else {
            setTasks(tasksData || []);
          }
        }
      }
    } catch (error) {
      console.error("Proje ve görev yükleme hatası:", error);
    }
  };

  // Organizasyon oluştur
  const createOrganization = async (name: string, description: string) => {
    try {
      if (!user) return { success: false, error: "Kullanıcı bulunamadı" };

      // Organizasyonu oluştur
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name: name.trim(),
          created_by: user.id,
        })
        .select()
        .single();

      if (orgError) {
        throw orgError;
      }

      // Oluşturan kişiyi owner olarak ekle
      const { error: memberError } = await supabase.from("memberships").insert({
        user_id: user.id,
        organization_id: orgData.id,
        role: "owner",
      });

      if (memberError) {
        throw memberError;
      }

      // Verileri yeniden yükle
      await loadUserData(user.id);
      setShowCreateOrgModal(false);

      return { success: true };
    } catch (error: any) {
      console.error("Organizasyon oluşturma hatası:", error);
      return { success: false, error: error.message || "Bilinmeyen hata" };
    }
  };

  // Proje oluştur
  const createProject = async (
    name: string,
    description: string,
    organizationId: string
  ) => {
    try {
      if (!user) return { success: false, error: "Kullanıcı bulunamadı" };

      // Projeyi oluştur
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          organization_id: organizationId,
          created_by: user.id,
        })
        .select()
        .single();

      if (projectError) {
        throw projectError;
      }

      // Verileri yeniden yükle
      if (organizations.length > 0) {
        await loadProjectsAndTasks(organizations.map((org: any) => org.id));
      }

      setShowCreateProjectModal(false);

      return { success: true };
    } catch (error: any) {
      console.error("Proje oluşturma hatası:", error);
      return { success: false, error: error.message || "Bilinmeyen hata" };
    }
  };

  // Görev oluştur
  const createTask = async (
    title: string,
    description: string,
    projectId: string,
    status: string
  ) => {
    try {
      if (!user) return { success: false, error: "Kullanıcı bulunamadı" };

      // Görevi oluştur
      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          project_id: projectId,
          status: status,
          created_by: user.id,
        })
        .select()
        .single();

      if (taskError) {
        throw taskError;
      }

      // Verileri yeniden yükle
      if (organizations.length > 0) {
        await loadProjectsAndTasks(organizations.map((org: any) => org.id));
      }

      setShowCreateTaskModal(false);

      return { success: true };
    } catch (error: any) {
      console.error("Görev oluşturma hatası:", error);
      return { success: false, error: error.message || "Bilinmeyen hata" };
    }
  };

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

      // Kullanıcının organizasyonlarını yükle
      await loadUserData(user.id);

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
        <div className="px-4 py-6 sm:px-0 space-y-8">
          {/* Başlık */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-2 text-gray-600">
              Organizasyonlarınız, projeleriniz ve görevlerinizi yönetin.
            </p>
          </div>

          {/* Organizasyonlar */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Organizasyonlar
                </h2>
                <p className="text-sm text-gray-600">
                  Şirket ve ekiplerinizi yönetin
                </p>
              </div>
              <button
                onClick={() => setShowCreateOrgModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Organizasyon Ekle
              </button>
            </div>
            <div className="p-6">
              {organizations.length === 0 ? (
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
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m4 0v-6a2 2 0 012-2h2a2 2 0 012 2v6"
                    />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Henüz organizasyon yok
                  </h3>
                  <p className="text-gray-600 mb-4">
                    İlk organizasyonunuzu oluşturarak başlayın. Organizasyon
                    olmadan proje ve görev ekleyemezsiniz.
                  </p>
                  <button
                    onClick={() => setShowCreateOrgModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                  >
                    İlk Organizasyonumu Oluştur
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {organizations.map((org) => (
                    <div
                      key={org.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <h3 className="font-semibold text-gray-900">
                        {org.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Oluşturuldu:{" "}
                        {new Date(org.created_at).toLocaleDateString("tr-TR")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Projeler - Organizasyona göre gruplu */}
          {organizations.length > 0 && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Projeler
                  </h2>
                  <p className="text-sm text-gray-600">
                    Organizasyonlara göre gruplandırılmış projeleriniz
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateProjectModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
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
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Proje Ekle
                </button>
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
                    <p className="text-gray-600 mb-4">
                      İlk projenizi oluşturun ve çalışmaya başlayın.
                    </p>
                    <button
                      onClick={() => setShowCreateProjectModal(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200"
                    >
                      İlk Projemi Oluştur
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {groupProjectsByOrganization().map((group) => (
                      <div key={group.organization.id} className="border border-gray-200 rounded-lg overflow-hidden">
                        {/* Organizasyon Başlığı */}
                        <div className="bg-gradient-to-r from-green-50 to-blue-50 px-4 py-3 border-b border-gray-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="flex-shrink-0">
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
                                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m4 0v-6a2 2 0 012-2h2a2 2 0 012 2v6"
                                    />
                                  </svg>
                                </div>
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {group.organization.name}
                                </h3>
                                <p className="text-sm text-gray-600">
                                  {group.projects.length} proje
                                </p>
                              </div>
                            </div>
                            <div className="text-sm text-gray-500">
                              {group.projects.length} / ∞
                            </div>
                          </div>
                        </div>

                        {/* Projeler Grid */}
                        <div className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {group.projects.map((project) => (
                              <div
                                key={project.id}
                                className="group relative bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-green-300 hover:shadow-lg transition-all duration-200 cursor-pointer"
                              >
                                {/* Proje İkonu */}
                                <div className="absolute top-4 right-4">
                                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
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
                                </div>

                                {/* Proje Bilgileri */}
                                <div className="pr-12">
                                  <h4 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-green-700 transition-colors">
                                    {project.name}
                                  </h4>
                                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                    {project.description || "Bu proje için henüz açıklama eklenmemiş."}
                                  </p>

                                  {/* Alt Bilgiler */}
                                  <div className="flex items-center justify-between text-xs text-gray-500">
                                    <span className="flex items-center space-x-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                      <span>{new Date(project.created_at).toLocaleDateString("tr-TR")}</span>
                                    </span>
                                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full">
                                      Aktif
                                    </span>
                                  </div>
                                </div>

                                {/* Hover Efekti */}
                                <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-blue-500/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Görevler - Sadece proje varsa göster */}
          {projects.length > 0 && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Görevler
                  </h2>
                  <p className="text-sm text-gray-600">
                    Görevlerinizi organize edin
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateTaskModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
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
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Görev Ekle
                </button>
              </div>
              <div className="p-6">
                {tasks.length === 0 ? (
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
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Henüz görev yok
                    </h3>
                    <p className="text-gray-600 mb-4">
                      İlk görevinizi oluşturun ve işe koyulun.
                    </p>
                    <button
                      onClick={() => setShowCreateTaskModal(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200"
                    >
                      İlk Görevimi Oluştur
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <h3 className="font-semibold text-gray-900">
                          {task.title}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {task.description || "Açıklama yok"}
                        </p>
                        <span
                          className={`inline-block px-2 py-1 text-xs rounded-full ${
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
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Organizasyon Oluştur Modalı */}
      {showCreateOrgModal && (
        <CreateOrganizationModal
          onClose={() => setShowCreateOrgModal(false)}
          onCreate={createOrganization}
        />
      )}

      {/* Proje Oluştur Modalı */}
      {showCreateProjectModal && (
        <CreateProjectModal
          organizations={organizations}
          onClose={() => setShowCreateProjectModal(false)}
          onCreate={createProject}
        />
      )}

      {/* Görev Oluştur Modalı */}
      {showCreateTaskModal && (
        <CreateTaskModal
          projects={projects}
          onClose={() => setShowCreateTaskModal(false)}
          onCreate={createTask}
        />
      )}
    </div>
  );
}
