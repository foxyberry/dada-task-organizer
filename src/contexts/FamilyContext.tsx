import React, { createContext, useContext, useState, useEffect } from "react";
import { auth } from "../firebase.js";
import { apiService } from "../services/apiService.js";
import { toast } from "sonner";

interface FamilyGroup {
  id: string;
  name: string;
  ownerId: string;
  members: string[];
  createdAt: string;
}

interface FamilyContextType {
  families: FamilyGroup[];
  loading: boolean;
  createFamily: (name: string) => Promise<void>;
  joinFamily: (code: string) => Promise<void>;
  generateInvite: (familyId: string) => Promise<string>;
  refreshFamilies: () => Promise<void>;
}

const FamilyContext = createContext<FamilyContextType | undefined>(undefined);

export const FamilyProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [families, setFamilies] = useState<FamilyGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshFamilies = async () => {
    if (!auth.currentUser) {
      setFamilies([]);
      setLoading(false);
      return;
    }

    try {
      const data = await apiService.getFamilies();
      setFamilies(data);
    } catch (error) {
      console.error("Error fetching families:", error);
      toast.error("Failed to load family groups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        refreshFamilies();
      } else {
        setFamilies([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const createFamily = async (name: string) => {
    try {
      await apiService.createFamily(name);
      toast.success("Family group created!");
      await refreshFamilies();
    } catch (error: any) {
      toast.error(error.message || "Failed to create family group");
      throw error;
    }
  };

  const joinFamily = async (code: string) => {
    try {
      await apiService.joinFamily(code);
      toast.success("Joined family group!");
      await refreshFamilies();
    } catch (error: any) {
      toast.error(error.message || "Failed to join family group");
      throw error;
    }
  };

  const generateInvite = async (familyId: string) => {
    try {
      const invite = await apiService.generateInvite(familyId);
      return invite.code;
    } catch (error: any) {
      toast.error(error.message || "Failed to generate invite code");
      throw error;
    }
  };

  return (
    <FamilyContext.Provider
      value={{
        families,
        loading,
        createFamily,
        joinFamily,
        generateInvite,
        refreshFamilies,
      }}
    >
      {children}
    </FamilyContext.Provider>
  );
};

export const useFamily = () => {
  const context = useContext(FamilyContext);
  if (context === undefined) {
    throw new Error("useFamily must be used within a FamilyProvider");
  }
  return context;
};
