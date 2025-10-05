"use client";

import { useState } from "react";

interface CreateTaskModalProps {
  projects: Array<{
    id: string;
    name: string;
    organization_id: string;
  }>;
  onClose: () => void;
  onCreate: (
    title: string,
    description: string,
    projectId: string,
    status: string
  ) => Promise<{ success: boolean; error?: string }>;
}

export default function CreateTaskModal({
  projects,
  onClose,
  onCreate,
}: CreateTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState(
    projects.length > 0 ? projects[0].id : ""
  );
  const [status, setStatus] = useState("todo");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const statusOptions = [
    { value: "todo", label: "Yapılacak" },
    { value: "in_progress", label: "Devam Ediyor" },
    { value: "done", label: "Tamamlandı" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    console.log("Görev form submit edildi:", {
      title,
      description,
      selectedProjectId,
      status,
    });

    if (!title.trim()) {
      setError("Görev başlığı gereklidir.");
      setLoading(false);
      return;
    }

    if (!selectedProjectId) {
      setError("Proje seçimi gereklidir.");
      setLoading(false);
      return;
    }

    const result = await onCreate(
      title,
      description,
      selectedProjectId,
      status
    );

    if (!result.success) {
      setError(result.error || "Görev oluşturulurken bir hata oluştu.");
      setLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
      onClick={handleBackdropClick}
    >
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Yeni Görev Oluştur
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              type="button"
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

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="projectSelect"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Proje *
              </label>
              <select
                id="projectSelect"
                name="projectSelect"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full px-3 py-2 text-black border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                disabled={loading}
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="taskTitle"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Görev Başlığı *
              </label>
              <input
                type="text"
                id="taskTitle"
                name="taskTitle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-black border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Görev başlığını girin"
                disabled={loading}
                autoComplete="off"
                autoFocus
              />
            </div>

            <div>
              <label
                htmlFor="taskDescription"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Açıklama (Opsiyonel)
              </label>
              <textarea
                id="taskDescription"
                name="taskDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-black border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                placeholder="Görev hakkında detaylı açıklama"
                disabled={loading}
              />
            </div>

            <div>
              <label
                htmlFor="taskStatus"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Durum
              </label>
              <select
                id="taskStatus"
                name="taskStatus"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 text-black border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                disabled={loading}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-50"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={loading || !title.trim() || !selectedProjectId}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Oluşturuluyor..." : "Görev Oluştur"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
