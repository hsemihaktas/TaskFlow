"use client";

import { useState } from "react";

interface Member {
  id: string;
  user_id: string;
  role: string;
  profiles?: {
    full_name?: string;
    avatar_url?: string;
  };
}

interface MemberManagementModalProps {
  members: Member[];
  currentUserRole: string;
  currentUserId?: string;
  onClose: () => void;
  onUpdateRole: (memberId: string, newRole: string) => void;
  updatingMember: string | null;
}

export default function MemberManagementModal({
  members,
  currentUserRole,
  currentUserId,
  onClose,
  onUpdateRole,
  updatingMember,
}: MemberManagementModalProps) {
  const [expandedMember, setExpandedMember] = useState<string | null>(null);

  // Rol değiştirme yetkisi kontrolü
  const canUpdateRole = (member: Member) => {
    // Sadece owner ve admin rol değiştirebilir
    if (currentUserRole !== "owner" && currentUserRole !== "admin")
      return false;

    // Admin, başka admin'lerin rolünü değiştiremez
    if (currentUserRole === "admin" && member.role === "admin") return false;

    // Admin, owner'ın rolünü değiştiremez
    if (currentUserRole === "admin" && member.role === "owner") return false;

    // Kullanıcı kendi rolünü değiştiremez
    if (member.user_id === currentUserId) return false;

    return true;
  };

  // Hangi rollere değiştirilebilir
  const getAvailableRoles = (member: Member) => {
    const roles = [];

    if (currentUserRole === "owner") {
      // Owner sadece member ve admin yapabilir (başka owner oluşturamaz)
      if (member.user_id !== currentUserId) {
        roles.push(
          { value: "member", label: "Üye" },
          { value: "admin", label: "Yönetici" }
        );
      }
    } else if (currentUserRole === "admin") {
      // Admin sadece member yapabilir
      if (member.role !== "admin" && member.role !== "owner") {
        roles.push({ value: "member", label: "Üye" });
      }
      // Member'ları admin yapabilir
      if (member.role === "member") {
        roles.push({ value: "admin", label: "Yönetici" });
      }
    }

    return roles.filter((role) => role.value !== member.role);
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case "owner":
        return "Sahip";
      case "admin":
        return "Yönetici";
      default:
        return "Üye";
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "owner":
        return "text-red-600 bg-red-50";
      case "admin":
        return "text-blue-600 bg-blue-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Üye Yönetimi</h2>
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
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-4">
            {members.map((member) => (
              <div
                key={member.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  {/* Üye Bilgileri */}
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      {member.profiles?.avatar_url ? (
                        <img
                          src={member.profiles.avatar_url}
                          alt="Avatar"
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-600 font-medium text-lg">
                          {member.profiles?.full_name?.charAt(0) || "?"}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {member.profiles?.full_name || "İsimsiz Kullanıcı"}
                        {member.user_id === currentUserId && (
                          <span className="text-sm text-blue-600 ml-2">
                            (Siz)
                          </span>
                        )}
                      </h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(
                            member.role
                          )}`}
                        >
                          {getRoleName(member.role)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Rol Değiştirme */}
                  <div className="flex items-center space-x-2">
                    {canUpdateRole(member) && (
                      <div className="relative">
                        <button
                          onClick={() =>
                            setExpandedMember(
                              expandedMember === member.id ? null : member.id
                            )
                          }
                          disabled={updatingMember === member.id}
                          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors disabled:opacity-50"
                        >
                          {updatingMember === member.id ? (
                            <div className="flex items-center space-x-2">
                              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                              <span>Güncelleniyor...</span>
                            </div>
                          ) : (
                            "Rol Değiştir"
                          )}
                        </button>

                        {/* Dropdown */}
                        {expandedMember === member.id && (
                          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[120px]">
                            {getAvailableRoles(member).map((role) => (
                              <button
                                key={role.value}
                                onClick={() => {
                                  onUpdateRole(member.id, role.value);
                                  setExpandedMember(null);
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-black hover:bg-gray-50 transition-colors"
                              >
                                {role.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {!canUpdateRole(member) && (
                      <span className="text-sm text-gray-400">
                        {member.user_id === currentUserId
                          ? "Kendi rolünüz"
                          : "Yetkisiz"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
