"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Task, TaskAssignment } from "@/types";

interface TaskDetailPanelProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  canEdit: boolean;
  currentUserId?: string;
  userRole?: "owner" | "admin" | "member";
}

export default function TaskDetailPanel({
  task,
  isOpen,
  onClose,
  onTaskUpdate,
  canEdit,
  currentUserId,
  userRole,
}: TaskDetailPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [editedStatus, setEditedStatus] = useState<
    "todo" | "in_progress" | "done"
  >("todo");
  const [isSaving, setIsSaving] = useState(false);
  const [creatorName, setCreatorName] = useState<string>("");
  const [assignments, setAssignments] = useState<TaskAssignment[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);

  type TaskAssignmentResponse = {
    assigned_to: string;
    assigned_at: string;
    assigned_by: string;
    profiles: {
      full_name?: string;
      avatar_url?: string;
    } | null;
  };

  // Task değiştiğinde form verilerini güncelle
  useEffect(() => {
    if (task) {
      setEditedTitle(task.title);
      setEditedDescription(task.description || "");
      setEditedStatus(task.status);
      loadCreatorInfo(task.created_by);
      // Assignment verilerini avatar ile birlikte yükle
      loadTaskAssignments(task.id);
    }
  }, [task]);

  // Panel açıkken assignments'ları düzenli güncelle
  useEffect(() => {
    if (!isOpen || !task) return;

    // Panel açılır açılmaz hemen yükle
    loadTaskAssignments(task.id);

    const pollInterval = setInterval(() => {
      loadTaskAssignments(task.id);
    }, 10000); // 10 saniye

    return () => {
      clearInterval(pollInterval);
    };
  }, [isOpen, task?.id]);

  // Görev oluşturanın bilgisini getir
  const loadCreatorInfo = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", userId)
        .single();

      if (!error && profile) {
        setCreatorName(profile.full_name || "Bilinmeyen Kullanıcı");
      }
    } catch (error) {
      console.error("Oluşturan bilgisi alınamadı:", error);
      setCreatorName("Bilinmeyen Kullanıcı");
    }
  };

  // Görev assignments'ını yeniden yükle
  const loadTaskAssignments = async (
    taskId: string
  ): Promise<TaskAssignment[]> => {
    try {
      const { data, error } = await supabase
        .from("task_assignments")
        .select(
          `
          assigned_to,
          assigned_at,
          assigned_by,
          profiles!assigned_to (
            full_name,
            avatar_url
          )
        `
        )
        .eq("task_id", taskId);

      if (!error && data) {
        const formattedAssignments: TaskAssignment[] = (
          data as TaskAssignmentResponse[]
        ).map((item) => ({
          user_id: item.assigned_to,
          full_name: item.profiles?.full_name || "Bilinmeyen Kullanıcı",
          assigned_at: item.assigned_at,
          assigned_by: item.assigned_by,
          avatar_url: item.profiles?.avatar_url ?? undefined,
        }));
        setAssignments(formattedAssignments);
        return formattedAssignments;
      }
    } catch (error) {
      console.error("Assignment bilgileri alınamadı:", error);
    }
    return [];
  };

  // Değişiklikleri kaydet
  const handleSave = async () => {
    if (!task || !canEdit) return;

    setIsSaving(true);
    try {
      const updates = {
        title: editedTitle.trim(),
        description: editedDescription.trim(),
        status: editedStatus,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", task.id);

      if (error) {
        throw error;
      }

      // Parent component'e bildir
      onTaskUpdate(task.id, updates);
      setIsEditing(false);
    } catch (error) {
      console.error("Görev güncellenirken hata:", error);
      alert("Görev güncellenirken bir hata oluştu.");
    } finally {
      setIsSaving(false);
    }
  };

  // Düzenlemeyi iptal et
  const handleCancelEdit = () => {
    if (task) {
      setEditedTitle(task.title);
      setEditedDescription(task.description || "");
      setEditedStatus(task.status);
    }
    setIsEditing(false);
  };

  // Görevi kendine ata
  const handleAssignToSelf = async () => {
    if (!task || !currentUserId) return;

    setIsAssigning(true);
    try {
      const { error } = await supabase.from("task_assignments").insert({
        task_id: task.id,
        assigned_to: currentUserId,
        assigned_by: currentUserId,
      });

      if (error) {
        throw error;
      }

      // Assignments'ları yeniden yükle
      const updatedAssignments = await loadTaskAssignments(task.id);

      // Parent component'e güncel assignments bilgisini gönder
      onTaskUpdate(task.id, { assignments: updatedAssignments });
    } catch (error: unknown) {
      console.error("Görev atama hatası:", error);
      if (
        error instanceof Error &&
        (error as { code?: string }).code === "23505"
      ) {
        // Unique constraint violation
        alert("Bu göreve zaten atanmışsınız.");
      } else {
        alert("Görev atanamadı. Lütfen tekrar deneyin.");
      }
    } finally {
      setIsAssigning(false);
    }
  };

  // Kendi atamasını kaldır
  const handleUnassignSelf = async () => {
    if (!task || !currentUserId) return;

    setIsAssigning(true);
    try {
      const { error } = await supabase
        .from("task_assignments")
        .delete()
        .eq("task_id", task.id)
        .eq("assigned_to", currentUserId);

      if (error) {
        throw error;
      }

      // Assignments'ları yeniden yükle
      const updatedAssignments = await loadTaskAssignments(task.id);

      // Parent component'e güncel assignments bilgisini gönder
      onTaskUpdate(task.id, { assignments: updatedAssignments });
    } catch (error) {
      console.error("Görev atama kaldırma hatası:", error);
      alert("Görev ataması kaldırılamadı. Lütfen tekrar deneyin.");
    } finally {
      setIsAssigning(false);
    }
  };

  // Başka kullanıcıyı görevden çıkar (admin/owner için)
  const handleUnassignUser = async (userId: string) => {
    if (!task || !currentUserId) return;

    setIsAssigning(true);
    try {
      const { error } = await supabase
        .from("task_assignments")
        .delete()
        .eq("task_id", task.id)
        .eq("assigned_to", userId);

      if (error) {
        throw error;
      }

      // Assignments'ları yeniden yükle
      const updatedAssignments = await loadTaskAssignments(task.id);

      // Parent component'e güncel assignments bilgisini gönder
      onTaskUpdate(task.id, { assignments: updatedAssignments });
    } catch (error) {
      console.error("Kullanıcı çıkarma hatası:", error);
      alert("Kullanıcı çıkarılamadı. Lütfen tekrar deneyin.");
    } finally {
      setIsAssigning(false);
    }
  };

  // Kullanıcıyı çıkarma yetkisi kontrolü
  const canRemoveUser = (assignedUserId: string): boolean => {
    if (!userRole || !currentUserId) return false;

    // Kendini herkes çıkarabilir
    if (assignedUserId === currentUserId) return true;

    // Owner herkes çıkarabilir (kendisi hariç, ama o zaten üstte kontrol edildi)
    if (userRole === "owner") return true;

    // Admin owner'ı çıkaramaz, ama diğer admin ve member'ları çıkarabilir
    // Bu kontrol için assigned user'ın role'ünü bilmemiz gerekir
    // Şimdilik admin'ler de çıkarabilsin, gelecekte daha detaylı kontrol ekleriz
    if (userRole === "admin") return true;

    return false;
  };

  // Durum rengi ve adını al
  const getStatusInfo = (status: string) => {
    switch (status) {
      case "todo":
        return {
          name: "Bekliyor",
          color: "bg-gray-100 text-gray-800",
          dot: "bg-gray-500",
        };
      case "in_progress":
        return {
          name: "Yapım Aşamasında",
          color: "bg-yellow-100 text-yellow-800",
          dot: "bg-yellow-500",
        };
      case "done":
        return {
          name: "Tamamlandı",
          color: "bg-green-100 text-green-800",
          dot: "bg-green-500",
        };
      default:
        return {
          name: "Bilinmeyen",
          color: "bg-gray-100 text-gray-800",
          dot: "bg-gray-500",
        };
    }
  };

  if (!isOpen || !task) {
    return null;
  }

  const statusInfo = getStatusInfo(task.status);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 bg-opacity-25"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Görev Detayları
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Başlık */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Görev Başlığı
                </label>
                {canEdit && !isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Düzenle
                  </button>
                )}
              </div>
              {isEditing ? (
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="w-full p-3 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Görev başlığı..."
                />
              ) : (
                <h3 className="text-xl font-semibold text-gray-900">
                  {task.title}
                </h3>
              )}
            </div>

            {/* Durum */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Durum
              </label>
              {isEditing ? (
                <select
                  value={editedStatus}
                  onChange={(e) =>
                    setEditedStatus(
                      e.target.value as "todo" | "in_progress" | "done"
                    )
                  }
                  className="w-full p-3 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="todo">Bekliyor</option>
                  <option value="in_progress">Yapım Aşamasında</option>
                  <option value="done">Tamamlandı</option>
                </select>
              ) : (
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}
                >
                  <div
                    className={`w-2 h-2 ${statusInfo.dot} rounded-full mr-2`}
                  ></div>
                  {statusInfo.name}
                </span>
              )}
            </div>

            {/* Açıklama */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Açıklama
              </label>
              {isEditing ? (
                <textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  rows={6}
                  className="w-full p-3 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Görev açıklaması..."
                />
              ) : (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {task.description ||
                      "Bu görev için henüz açıklama eklenmemiş."}
                  </p>
                </div>
              )}
            </div>

            {/* Meta Bilgiler */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Oluşturan
                </label>
                <p className="text-gray-900">{creatorName}</p>
              </div>

              {/* Atanan Kişiler */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Atanan Kişiler
                </label>
                <div className="space-y-2">
                  {assignments.length > 0 ? (
                    <div className="space-y-2">
                      {assignments.map((assignment, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-gray-50 p-2 rounded-lg"
                        >
                          <div className="flex items-center space-x-2">
                            {assignment.avatar_url ? (
                              <img
                                src={assignment.avatar_url}
                                alt={assignment.full_name}
                                className="w-6 h-6 rounded-full object-cover"
                                onError={(e) => {
                                  // Avatar yüklenemezse fallback göster
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = "none";
                                  target.nextElementSibling?.classList.remove(
                                    "hidden"
                                  );
                                }}
                              />
                            ) : null}
                            <div
                              className={`w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium ${
                                assignment.avatar_url ? "hidden" : ""
                              }`}
                            >
                              {assignment.full_name.charAt(0)}
                            </div>
                            <span className="text-sm text-gray-900">
                              {assignment.full_name}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">
                              {new Date(
                                assignment.assigned_at
                              ).toLocaleDateString("tr-TR")}
                            </span>
                            {canRemoveUser(assignment.user_id) && (
                              <button
                                onClick={() =>
                                  assignment.user_id === currentUserId
                                    ? handleUnassignSelf()
                                    : handleUnassignUser(assignment.user_id)
                                }
                                disabled={isAssigning}
                                className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50 transition-colors"
                              >
                                {assignment.user_id === currentUserId
                                  ? "Çık"
                                  : "Çıkar"}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Kimseye atanmamış</p>
                  )}

                  {/* Kendine atama butonu */}
                  {currentUserId &&
                    !assignments.some((a) => a.user_id === currentUserId) && (
                      <button
                        onClick={handleAssignToSelf}
                        disabled={isAssigning}
                        className="w-full mt-2 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50 transition-colors"
                      >
                        {isAssigning ? "Atanıyor..." : "Bana Ata"}
                      </button>
                    )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Oluşturulma Tarihi
                </label>
                <p className="text-gray-900">
                  {new Date(task.created_at).toLocaleString("tr-TR")}
                </p>
              </div>

              {task.updated_at && task.updated_at !== task.created_at && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Son Güncelleme
                  </label>
                  <p className="text-gray-900">
                    {new Date(task.updated_at).toLocaleString("tr-TR")}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer - Düzenleme Butonları */}
          {isEditing && canEdit && (
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex space-x-3">
                <button
                  onClick={handleSave}
                  disabled={isSaving || !editedTitle.trim()}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSaving ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Kaydediliyor...</span>
                    </div>
                  ) : (
                    "Kaydet"
                  )}
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  İptal
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
