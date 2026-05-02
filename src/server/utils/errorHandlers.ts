import logger from "./logger.js";

export const handleFirestoreError = async (error: any, operationType: string, path: string | null, userId?: string) => {
  if (error.message && (error.message.includes("insufficient permissions") || error.code === 7)) {
    logger.error({ err: error, operationType, path, userId }, "Firestore permission denied");
    throw new Error("데이터 접근 권한이 없습니다");
  }
  throw error;
};
