"use client";

import { useState } from "react";

interface InviteMemberModalProps {
  onClose: () => void;
  onInvite: (
    email: string,
    role: string
  ) => Promise<{ success: boolean; error?: string; inviteLink?: string; userExists?: boolean; userName?: string }>;
  organizationName?: string;
}

export default function InviteMemberModal({
  onClose,
  onInvite,
  organizationName,
}: InviteMemberModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [inviteStep, setInviteStep] = useState<"form" | "success">("form");
  const [userExists, setUserExists] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>("");

  const roleOptions = [
    { value: "member", label: "Üye" },
    { value: "admin", label: "Yönetici" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!email.trim()) {
      setError("E-posta adresi gereklidir.");
      setLoading(false);
      return;
    }

    // Basit e-posta validasyonu
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Geçerli bir e-posta adresi girin.");
      setLoading(false);
      return;
    }

    const result = await onInvite(email, role);

    if (!result.success) {
      setError(result.error || "Davet gönderilirken bir hata oluştu.");
      setLoading(false);
    } else if (result.inviteLink) {
      setInviteLink(result.inviteLink);
      setUserExists(result.userExists || false);
      setUserName(result.userName || "");
      setInviteStep("success");
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
      className="fixed inset-0 bg-black/50 bg-opacity-50 overflow-y-auto h-full w-full z-50"
      onClick={handleBackdropClick}
    >
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {inviteStep === "form" ? "Üye Davet Et" : "Davet Linki"}
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

          {inviteStep === "form" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  E-posta Adresi *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-black border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="kullanici@ornek.com"
                  disabled={loading}
                  autoComplete="off"
                  autoFocus
                />
              </div>

              <div>
                <label
                  htmlFor="role"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Rol
                </label>
                <select
                  id="role"
                  name="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 text-black border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={loading}
                >
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Yöneticiler proje oluşturabilir ve üye davet edebilir.
                </p>
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
                  disabled={loading || !email.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Davet Gönderiliyor..." : "Davet Gönder"}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <svg
                    className="w-5 h-5 text-green-600 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <h4 className="font-medium text-green-800">
                    Davet Başarıyla Oluşturuldu!
                  </h4>
                </div>
                <p className="text-sm text-green-700 mb-3">
                  {userExists 
                    ? `${userName || email} sistemde kayıtlı bir kullanıcı. Davet başarıyla gönderildi.`
                    : `${email} henüz sistemde kayıtlı değil. Kayıt olması için davet linki oluşturuldu.`
                  } Aşağıdaki linki kopyalayıp davet etmek istediğiniz kişiye gönderin.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Davet Linki
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={inviteLink}
                    readOnly
                    className="flex-1 px-3 py-2 text-sm text-gray-600 bg-gray-50 border border-gray-300 rounded-md focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(inviteLink);
                      // Kopyalandı feedback'i burada eklenebilir
                    }}
                    className="px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md"
                  >
                    Kopyala
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  <strong>Organizasyon:</strong>{" "}
                  {organizationName || "Bu organizasyon"}
                  <br />
                  <strong>Rol:</strong> {role === "admin" ? "Yönetici" : "Üye"}
                  <br />
                  <strong>Davet Edilen:</strong> {email}
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setInviteStep("form");
                    setEmail("");
                    setRole("member");
                    setInviteLink("");
                    setError("");
                    setUserExists(false);
                    setUserName("");
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Yeni Davet
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                >
                  Kapat
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
