"use client";

import { useState } from "react";

interface CreateProjectModalProps {
  organizations: Array<{
    id: string;
    name: string;
  }>;
  onClose: () => void;
  onCreate: (
    name: string,
    description: string,
    organizationId: string
  ) => Promise<{ success: boolean; error?: string }>;
}

export default function CreateProjectModal({
  organizations,
  onClose,
  onCreate,
}: CreateProjectModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState(
    organizations.length > 0 ? organizations[0].id : ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    console.log("Proje form submit edildi:", {
      name,
      description,
      selectedOrgId,
    });

    if (!name.trim()) {
      setError("Proje adı gereklidir.");
      setLoading(false);
      return;
    }

    if (!selectedOrgId) {
      setError("Organizasyon seçimi gereklidir.");
      setLoading(false);
      return;
    }

    const result = await onCreate(name, description, selectedOrgId);

    if (!result.success) {
      setError(result.error || "Proje oluşturulurken bir hata oluştu.");
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
              Yeni Proje Oluştur
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
                htmlFor="orgSelect"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Organizasyon *
              </label>
              <select
                id="orgSelect"
                name="orgSelect"
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                className="w-full px-3 py-2 text-black border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                disabled={loading}
              >
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="projectName"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Proje Adı *
              </label>
              <input
                type="text"
                id="projectName"
                name="projectName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-black  border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Proje adını girin"
                disabled={loading}
                autoComplete="off"
                autoFocus
              />
            </div>

            <div>
              <label
                htmlFor="projectDescription"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Açıklama (Opsiyonel)
              </label>
              <textarea
                id="projectDescription"
                name="projectDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-black border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                placeholder="Proje hakkında kısa açıklama"
                disabled={loading}
              />
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
                disabled={loading || !name.trim() || !selectedOrgId}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Oluşturuluyor..." : "Proje Oluştur"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
