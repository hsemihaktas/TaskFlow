"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";
import CreateTaskModal from "@/components/project/CreateTaskModal";
import TaskCard from "@/components/project/TaskCard";
import TaskDetailPanel from "@/components/project/TaskDetailPanel";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Organization, Project, Task, TaskAssignment, Profile } from "@/types";

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);

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

  // Görevleri duruma göre grupla
  const getTasksByStatus = (status: "todo" | "in_progress" | "done") => {
    return tasks.filter((task) => task.status === status);
  };

  // Proje verilerini yükle
  const loadProjectData = async (userId: string) => {
    try {
      // Proje bilgilerini getir
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (projectError) {
        console.error("Proje bulunamadı:", projectError);
        router.push("/dashboard");
        return;
      }

      setProject(projectData);

      // Organizasyon bilgilerini getir
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", projectData.organization_id)
        .single();

      if (!orgError && orgData) {
        setOrganization(orgData);
      }

      // Kullanıcının bu organizasyondaki rolünü kontrol et
      const { data: membershipData, error: membershipError } = await supabase
        .from("memberships")
        .select("role")
        .eq("user_id", userId)
        .eq("organization_id", projectData.organization_id)
        .single();

      if (!membershipError && membershipData) {
        setUserRole(membershipData.role);
      }

      // Proje görevlerini assignments ile birlikte getir
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks_with_assignments")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (!tasksError) {
        setTasks(tasksData || []);
      } else {
        console.error("Görevler yüklenirken hata:", tasksError);
      }
    } catch (error) {
      console.error("Veri yükleme hatası:", error);
    }
  };

  // Görev oluştur
  const createTask = async (
    title: string,
    description: string,
    status: "todo" | "in_progress" | "done"
  ) => {
    try {
      if (!user || !project)
        return { success: false, error: "Kullanıcı veya proje bulunamadı" };

      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          project_id: project.id,
          status: status,
          created_by: user.id,
        })
        .select()
        .single();

      if (taskError) {
        throw taskError;
      }

      // Görevleri yeniden yükle
      if (user.id) {
        await loadProjectData(user.id);
      }

      setShowCreateTaskModal(false);
      return { success: true };
    } catch (error: any) {
      console.error("Görev oluşturma hatası:", error);
      return { success: false, error: error.message || "Bilinmeyen hata" };
    }
  };

  // Görev durumunu güncelle (drag & drop için)
  const updateTaskStatus = useCallback(
    async (taskId: string, newStatus: "todo" | "in_progress" | "done") => {
      try {
        // Kullanıcının bu task'ı güncellemek için yetkisi var mı kontrol et
        if (!canManageTasks()) {
          // Admin/owner değilse, assigned mı kontrol et
          const task = tasks.find((t) => t.id === taskId);
          if (
            !task ||
            !user?.id ||
            !task.assignments?.some((a) => a.user_id === user.id)
          ) {
            reloadTasks();
            return { success: false, error: "Bu işlem için yetkiniz yok" };
          }
        }

        const { error } = await supabase
          .from("tasks")
          .update({ status: newStatus })
          .eq("id", taskId);

        if (error) {
          throw error;
        }

        // Local state'i güncelle
        setTasks((prevTasks) =>
          prevTasks.map((task) =>
            task.id === taskId ? { ...task, status: newStatus } : task
          )
        );

        return { success: true };
      } catch (error: any) {
        console.error("Görev durumu güncellenirken hata:", error);
        console.error("Error details:", {
          message: error?.message,
          code: error?.code,
          details: error?.details,
          hint: error?.hint,
        });

        // Task'ları yeniden yükle
        reloadTasks();

        return {
          success: false,
          error: error?.message || "Görev güncellenirken bir hata oluştu",
        };
      }
    },
    [tasks, user?.id, userRole]
  );

  // Yetki kontrolü
  const canManageTasks = () => {
    return userRole === "owner" || userRole === "admin";
  };

  // Görev silme fonksiyonu
  const deleteTask = useCallback(
    async (taskId: string, taskTitle: string) => {
      if (!user?.id) return { success: false, error: "Kullanıcı bulunamadı" };

      // Yetki kontrolü
      if (!canManageTasks()) {
        return { success: false, error: "Bu işlem için yetkiniz yok" };
      }

      // Confirm dialog göster
      return new Promise<{ success: boolean; error?: string }>((resolve) => {
        setConfirmDialog({
          isOpen: true,
          title: "Görevi Sil",
          message: `"${taskTitle}" görevini silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz.`,
          type: "danger",
          onConfirm: async () => {
            setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
            await performTaskDelete(taskId, resolve);
          },
        });
      });
    },
    [user?.id, userRole, selectedTask]
  );

  // Gerçek silme işlemi
  const performTaskDelete = async (
    taskId: string,
    resolve: (value: { success: boolean; error?: string }) => void
  ) => {
    try {
      // Görevi sil - Cascade delete ile tüm ilgili veriler (assignments) silinir
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);

      if (error) {
        throw error;
      }

      // Local state'den kaldır
      setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId));

      // Task detail paneli açıksa ve silinen task ise kapat
      if (selectedTask?.id === taskId) {
        handleCloseTaskDetail();
      }

      resolve({ success: true });
    } catch (error: any) {
      console.error("Görev silme hatası:", error);
      resolve({ success: false, error: error.message || "Bilinmeyen hata" });
    }
  };

  // Görev silme (TaskCard'dan çağrılacak)
  const handleDeleteTask = (taskId: string, taskTitle: string) => {
    return deleteTask(taskId, taskTitle);
  };

  // Görev kartına tıklama
  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setShowTaskDetail(true);
  };

  // Görev detayını kapat
  const handleCloseTaskDetail = () => {
    setShowTaskDetail(false);
    setSelectedTask(null);
  };

  // Task'ları yeniden yükle (assignment değişikliği sonrası)
  const reloadTasks = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Proje görevlerini yeniden yükle
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks_with_assignments")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (!tasksError) {
        setTasks(tasksData || []);
      } else {
        console.error("Görevler yüklenirken hata:", tasksError);
      }
    } catch (error) {
      console.error("Task yeniden yükleme hatası:", error);
    }
  }, [user?.id, projectId]);

  // Görev güncelle (detay panelinden)
  const handleTaskUpdate = useCallback(
    async (taskId: string, updates: Partial<Task>) => {
      // Tüm güncellemeleri (assignments dahil) local state'e uygula
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === taskId ? { ...task, ...updates } : task
        )
      );

      // Seçili task'ı da güncelle
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask({ ...selectedTask, ...updates });
      }
    },
    [selectedTask]
  );

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

      // Proje verilerini yükle
      await loadProjectData(user.id);
      setLoading(false);
    };

    getUser();
  }, [projectId, router]);

  // Düzenli data polling - her 15 saniyede bir güncelle
  useEffect(() => {
    if (!user?.id || loading) return;

    const pollInterval = setInterval(() => {
      reloadTasks();
    }, 5000); // 5 saniye

    return () => {
      clearInterval(pollInterval);
    };
  }, [user?.id, loading, reloadTasks]);

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

  if (!project || !organization) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Proje Bulunamadı
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
        <div className="px-4 py-6 sm:px-0">
          {/* Proje Başlığı */}
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
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
                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {project.name}
                  </h1>
                  <p className="text-gray-600 mb-2">
                    {project.description ||
                      "Bu proje için henüz açıklama eklenmemiş."}
                  </p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>Organizasyon: {organization.name}</span>
                    <span>•</span>
                    <span>
                      Oluşturuldu:{" "}
                      {new Date(project.created_at).toLocaleDateString("tr-TR")}
                    </span>
                    <span>•</span>
                    <span>{tasks.length} görev</span>
                  </div>
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
                {canManageTasks() && (
                  <button
                    onClick={() => setShowCreateTaskModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
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
                    Yeni Görev
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Kanban Board */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Bekliyor Kolonu */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-gray-100 px-4 py-3 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <div className="w-3 h-3 bg-gray-500 rounded-full mr-2"></div>
                    Bekliyor
                  </h3>
                  <span className="bg-gray-500 text-white text-xs px-2 py-1 rounded-full">
                    {getTasksByStatus("todo").length}
                  </span>
                </div>
              </div>
              <div
                className="p-4 space-y-4 min-h-[500px]"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const taskId = e.dataTransfer.getData("text/plain");
                  updateTaskStatus(taskId, "todo");
                }}
              >
                {getTasksByStatus("todo").map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onStatusUpdate={updateTaskStatus}
                    canEdit={canManageTasks()}
                    onTaskClick={handleTaskClick}
                    currentUserId={user?.id}
                    onRefresh={reloadTasks}
                    onDelete={handleDeleteTask}
                  />
                ))}
                {getTasksByStatus("todo").length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <svg
                      className="w-12 h-12 mx-auto mb-3 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p>Henüz bekleyen görev yok</p>
                  </div>
                )}
              </div>
            </div>

            {/* Yapım Aşamasında Kolonu */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-yellow-100 px-4 py-3 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                    Yapım Aşamasında
                  </h3>
                  <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                    {getTasksByStatus("in_progress").length}
                  </span>
                </div>
              </div>
              <div
                className="p-4 space-y-4 min-h-[500px]"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const taskId = e.dataTransfer.getData("text/plain");
                  updateTaskStatus(taskId, "in_progress");
                }}
              >
                {getTasksByStatus("in_progress").map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onStatusUpdate={updateTaskStatus}
                    canEdit={canManageTasks()}
                    onTaskClick={handleTaskClick}
                    currentUserId={user?.id}
                    onRefresh={reloadTasks}
                    onDelete={handleDeleteTask}
                  />
                ))}
                {getTasksByStatus("in_progress").length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <svg
                      className="w-12 h-12 mx-auto mb-3 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p>Henüz devam eden görev yok</p>
                  </div>
                )}
              </div>
            </div>

            {/* Bitti Kolonu */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-green-100 px-4 py-3 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    Bitti
                  </h3>
                  <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                    {getTasksByStatus("done").length}
                  </span>
                </div>
              </div>
              <div
                className="p-4 space-y-4 min-h-[500px]"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const taskId = e.dataTransfer.getData("text/plain");
                  updateTaskStatus(taskId, "done");
                }}
              >
                {getTasksByStatus("done").map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onStatusUpdate={updateTaskStatus}
                    canEdit={canManageTasks()}
                    onTaskClick={handleTaskClick}
                    currentUserId={user?.id}
                    onRefresh={reloadTasks}
                    onDelete={handleDeleteTask}
                  />
                ))}
                {getTasksByStatus("done").length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <svg
                      className="w-12 h-12 mx-auto mb-3 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p>Henüz tamamlanan görev yok</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Görev Oluştur Modalı */}
      {showCreateTaskModal && (
        <CreateTaskModal
          onClose={() => setShowCreateTaskModal(false)}
          onCreate={createTask}
        />
      )}

      {/* Görev Detay Paneli */}
      <TaskDetailPanel
        task={selectedTask}
        isOpen={showTaskDetail}
        onClose={handleCloseTaskDetail}
        onTaskUpdate={handleTaskUpdate}
        canEdit={canManageTasks()}
        currentUserId={user?.id}
        userRole={userRole as "owner" | "admin" | "member"}
      />

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
