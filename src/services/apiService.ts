import { auth } from "../firebase.js";

const getAuthHeaders = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");
  const token = await user.getIdToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

export const apiService = {
  async getProfile() {
    const headers = await getAuthHeaders();
    const response = await fetch("/api/profile", { headers });
    if (!response.ok) throw new Error("프로필 조회에 실패했습니다");
    return response.json();
  },

  async getFamilies() {
    const headers = await getAuthHeaders();
    const response = await fetch("/api/families", { headers });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "가족 그룹 조회에 실패했습니다");
    }
    return response.json();
  },

  async createFamily(name: string) {
    const headers = await getAuthHeaders();
    const response = await fetch("/api/family/create", {
      method: "POST",
      headers,
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "가족 그룹 생성에 실패했습니다");
    }
    return response.json();
  },

  async generateInvite(familyId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch("/api/family/invite", {
      method: "POST",
      headers,
      body: JSON.stringify({ familyId }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "초대 코드 생성에 실패했습니다");
    }
    return response.json();
  },

  async deleteAccount() {
    const headers = await getAuthHeaders();
    const response = await fetch("/api/account", {
      method: "DELETE",
      headers,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "계정 삭제에 실패했습니다");
    }
  },

  async joinFamily(code: string) {
    const headers = await getAuthHeaders();
    const response = await fetch("/api/family/join", {
      method: "POST",
      headers,
      body: JSON.stringify({ code }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "가족 그룹 참여에 실패했습니다");
    }
    return response.json();
  },
};
