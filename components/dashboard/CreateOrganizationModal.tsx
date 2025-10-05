"use client";

import { useState } from "react";

interface CreateOrganizationModalProps {
  onClose: () => void;
  onCreate: (
    name: string,
    description: string
  ) => Promise<{ success: boolean; error?: string }>;
}

export default function CreateOrganizationModal({
  onClose,
  onCreate,
}: CreateOrganizationModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
  };

  const handleDescriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const value = e.target.value;
    setDescription(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!name.trim()) {
      setError("Organizasyon adı gereklidir.");
      setLoading(false);
      return;
    }

    const result = await onCreate(name, description);

    if (!result.success) {
      setError(result.error || "Organizasyon oluşturulurken bir hata oluştu.");
      setLoading(false);
    }
  };

  // Modal backdrop'a tıklandığında kapanmasını engelle
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 bg-opacity-50 overflow-y-auto h-full w-full z-50"
      onClick={handleBackdropClick}
    >
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Yeni Organizasyon Oluştur
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
                htmlFor="orgName"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Organizasyon Adı *
              </label>
              <input
                type="text"
                id="orgName"
                name="orgName"
                value={name}
                onChange={handleNameChange}
                className="w-full px-3 py-2 text-black border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Şirket adınızı girin"
                disabled={loading}
                autoComplete="off"
                autoFocus
              />
            </div>

            <div>
              <label
                htmlFor="orgDescription"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Açıklama (Opsiyonel)
              </label>
              <textarea
                id="orgDescription"
                name="orgDescription"
                value={description}
                onChange={handleDescriptionChange}
                rows={3}
                className="w-full px-3 py-2 text-black border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="Organizasyon hakkında kısa açıklama"
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
                disabled={loading || !name.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Oluşturuluyor..." : "Organizasyon Oluştur"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
