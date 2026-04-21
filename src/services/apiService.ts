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
    if (!response.ok) throw new Error("Failed to fetch profile");
    return response.json();
  },

  async getFamilies() {
    const headers = await getAuthHeaders();
    const response = await fetch("/api/families", { headers });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (errorData.error) {
        try {
          const detail = JSON.parse(errorData.error);
          if (detail.authInfo) {
            throw new Error(`Firestore Access Denied: ${detail.operationType} on ${detail.path}. User: ${detail.authInfo.email}`);
          }
        } catch (e) {
          throw new Error(errorData.error);
        }
      }
      throw new Error("Failed to fetch families");
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
    if (!response.ok) throw new Error("Failed to create family group");
    return response.json();
  },

  async generateInvite(familyId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch("/api/family/invite", {
      method: "POST",
      headers,
      body: JSON.stringify({ familyId }),
    });
    if (!response.ok) throw new Error("Failed to generate invite code");
    return response.json();
  },

  async joinFamily(code: string) {
    const headers = await getAuthHeaders();
    const response = await fetch("/api/family/join", {
      method: "POST",
      headers,
      body: JSON.stringify({ code }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to join family group");
    }
    return response.json();
  },
};
