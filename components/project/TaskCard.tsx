"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

interface TaskAssignment {
  user_id: string;
  full_name: string;
  assigned_at: string;
  assigned_by: string;
  avatar_url?: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done";
  project_id: string;
  created_at: string;
  created_by: string;
  assignments?: TaskAssignment[];
}

interface TaskCardProps {
  task: Task;
  onStatusUpdate: (
    taskId: string,
    newStatus: "todo" | "in_progress" | "done"
  ) => Promise<{ success: boolean; error?: string }>;
  canEdit: boolean;
  onTaskClick: (task: Task) => void;
  currentUserId?: string;
  onRefresh?: () => void;
  onDelete?: (
    taskId: string,
    taskTitle: string
  ) => Promise<{ success: boolean; error?: string }>;
}

export default function TaskCard({
  task,
  onStatusUpdate,
  canEdit,
  onTaskClick,
  currentUserId,
  onRefresh,
  onDelete,
}: TaskCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Drag & Drop yetkisi kontrolü
  const canDrag = () => {
    // Admin/owner veya göreve atanmış kişi drag yapabilir
    return (
      canEdit ||
      (currentUserId &&
        task.assignments?.some((a) => a.user_id === currentUserId))
    );
  };

  // Database'de gerçek assignment durumunu kontrol et
  const checkAssignmentInDB = async () => {
    if (!currentUserId || canEdit) return true; // Admin/owner için gerekli değil

    try {
      const { data, error } = await supabase
        .from("task_assignments")
        .select("assigned_to")
        .eq("task_id", task.id)
        .eq("assigned_to", currentUserId)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows returned (assignment yok)
        console.error("Assignment kontrol hatası:", error);
        return false;
      }

      return !!data; // Assignment varsa true, yoksa false
    } catch (error) {
      console.error("Database kontrol hatası:", error);
      return false;
    }
  };

  // Drag & Drop olayları
  const handleDragStart = async (e: React.DragEvent) => {
    if (!canDrag()) {
      e.preventDefault();
      return;
    }

    // Database'de gerçek durumu kontrol et
    const isAssignedInDB = await checkAssignmentInDB();

    if (!isAssignedInDB) {
      e.preventDefault();

      // Sayfayı sessizce yenile
      if (onRefresh) {
        onRefresh();
      }
      return;
    }

    setIsDragging(true);
    e.dataTransfer.setData("text/plain", task.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Durum değiştirme (manuel)
  const handleStatusChange = async (
    newStatus: "todo" | "in_progress" | "done"
  ) => {
    if (!canEdit || task.status === newStatus) return;

    setIsUpdating(true);
    try {
      await onStatusUpdate(task.id, newStatus);
    } catch (error) {
      console.error("Durum güncellenirken hata:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Durum rengini belirle
  const getStatusColor = () => {
    switch (task.status) {
      case "todo":
        return "border-l-gray-500";
      case "in_progress":
        return "border-l-yellow-500";
      case "done":
        return "border-l-green-500";
      default:
        return "border-l-gray-500";
    }
  };

  const getStatusIcon = () => {
    switch (task.status) {
      case "todo":
        return (
          <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
            <svg
              className="w-3 h-3 text-gray-500"
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
        );
      case "in_progress":
        return (
          <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center">
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
        );
      case "done":
        return (
          <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
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
        );
      default:
        return null;
    }
  };

  // Kart tıklama olayı (drag işlemini engellememek için)
  const handleCardClick = (e: React.MouseEvent) => {
    // Eğer durum değiştirme butonlarına tıklanmışsa kartı açma
    if ((e.target as HTMLElement).closest(".status-button")) {
      return;
    }
    onTaskClick(task);
  };

  return (
    <div
      draggable={Boolean(canDrag())}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleCardClick}
      className={`
        group bg-white border-l-4 ${getStatusColor()} rounded-lg shadow-sm p-4 
        transition-all duration-200 cursor-pointer
        ${canDrag() ? "hover:shadow-md hover:scale-[1.02]" : ""}
        ${isDragging ? "opacity-50 scale-95" : ""}
        ${isUpdating ? "opacity-60" : ""}
        ${!canDrag() ? "cursor-default" : ""}
      `}
    >
      {/* Üst Kısım - Başlık, Silme Butonu ve Durum İkonu */}
      <div className="flex items-start justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900 leading-tight pr-2 flex-1">
          {task.title}
        </h4>

        <div className="flex items-center space-x-1 flex-shrink-0">
          {/* Silme Butonu - Sadece admin ve owner görebilir */}
          {canEdit && onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task.id, task.title);
              }}
              className="status-button w-5 h-5 bg-red-50 hover:bg-red-100 rounded flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
              title="Görevi Sil"
              disabled={isUpdating}
            >
              <svg
                className="w-3 h-3 text-red-600"
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
            </button>
          )}

          {/* Durum İkonu */}
          {getStatusIcon()}
        </div>
      </div>

      {/* Açıklama */}
      {task.description && (
        <p className="text-xs text-gray-600 mb-3 line-clamp-3">
          {task.description}
        </p>
      )}

      {/* Alt Kısım - Tarih ve Durum Değiştirme */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {new Date(task.created_at).toLocaleDateString("tr-TR")}
        </span>

        {/* Durum Değiştirme Butonları (yetkili kullanıcılar veya atanmış kişi için) */}
        {canDrag() && (
          <div className="flex items-center space-x-1">
            {task.status !== "todo" && (
              <button
                onClick={() => handleStatusChange("todo")}
                disabled={isUpdating}
                className="status-button p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title="Bekliyor'a taşı"
              >
                <svg
                  className="w-3 h-3"
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
              </button>
            )}

            {task.status !== "in_progress" && (
              <button
                onClick={() => handleStatusChange("in_progress")}
                disabled={isUpdating}
                className="status-button p-1 text-yellow-400 hover:text-yellow-600 transition-colors"
                title="Yapım Aşamasında'ya taşı"
              >
                <svg
                  className="w-3 h-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}

            {task.status !== "done" && (
              <button
                onClick={() => handleStatusChange("done")}
                disabled={isUpdating}
                className="status-button p-1 text-green-400 hover:text-green-600 transition-colors"
                title="Bitti'ye taşı"
              >
                <svg
                  className="w-3 h-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Yükleniyor İndikatörü */}
      {isUpdating && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
          <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
}
