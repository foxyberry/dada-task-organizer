
import { auth } from "firebase-admin";

export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerInfo: { providerId: string; displayName: string; email: string; }[];
  }
}

export const handleFirestoreError = async (error: any, operationType: FirestoreErrorInfo['operationType'], path: string | null, userId?: string) => {
  if (error.message && (error.message.includes("insufficient permissions") || error.code === 7)) {
    const authInfo: any = {
      userId: userId || 'unknown',
      email: 'unknown',
      emailVerified: false,
      isAnonymous: true,
      providerInfo: []
    };

    if (userId) {
      try {
        const user = await auth().getUser(userId);
        authInfo.email = user.email || 'unknown';
        authInfo.emailVerified = user.emailVerified || false;
        authInfo.isAnonymous = false;
        authInfo.providerInfo = user.providerData.map(p => ({
          providerId: p.providerId,
          displayName: p.displayName || '',
          email: p.email || ''
        }));
      } catch (authErr) {
        console.error("Error fetching user info for error report:", authErr);
      }
    }

    const info: FirestoreErrorInfo = {
      error: error.message,
      operationType,
      path,
      authInfo
    };

    throw new Error(JSON.stringify(info));
  }
  throw error;
};
