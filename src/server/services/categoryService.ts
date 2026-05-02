import { Timestamp } from "firebase-admin/firestore";
import type { CategoryRecord } from "../../shared/categoryTypes.js";
import { adminDb } from "../firebaseAdmin.js";

const ensureFamilyMembership = async (familyId: string, userId: string) => {
  const familyDoc = await adminDb.collection("familyGroups").doc(familyId).get();
  if (!familyDoc.exists) {
    throw new Error("가족 그룹을 찾을 수 없습니다");
  }

  const familyData = familyDoc.data();
  if (!familyData?.members.includes(userId)) {
    throw new Error("해당 가족 그룹의 멤버가 아닙니다");
  }
};

const getCategoryById = async (categoryId: string): Promise<CategoryRecord> => {
  const categoryDoc = await adminDb.collection("categories").doc(categoryId).get();
  if (!categoryDoc.exists) {
    throw new Error("카테고리를 찾을 수 없습니다");
  }

  return {
    id: categoryDoc.id,
    ...(categoryDoc.data() as Omit<CategoryRecord, "id">),
  } as CategoryRecord;
};

export const createCategory = async (
  name: string,
  userId: string,
  familyId?: string | null
): Promise<CategoryRecord> => {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("카테고리 이름을 입력해주세요");
  }

  if (trimmedName.length > 100) {
    throw new Error("카테고리 이름은 100자 이하로 입력해주세요");
  }

  if (familyId) {
    await ensureFamilyMembership(familyId, userId);
  }

  // Duplicate check within the same scope (case-insensitive)
  const scopeQuery = familyId
    ? adminDb.collection("categories").where("familyId", "==", familyId)
    : adminDb.collection("categories").where("userId", "==", userId).where("familyId", "==", null);

  const existing = await scopeQuery.get();
  const normalizedNew = trimmedName.toLowerCase();
  const isDuplicate = existing.docs.some(
    (doc) => (doc.data().name as string).trim().toLowerCase() === normalizedNew
  );
  if (isDuplicate) {
    throw new Error("이미 같은 이름의 카테고리가 존재합니다");
  }

  const categoryRef = adminDb.collection("categories").doc();
  const category: CategoryRecord = {
    id: categoryRef.id,
    name: trimmedName,
    userId,
    familyId: familyId ?? null,
    createdAt: Timestamp.now(),
  };

  await categoryRef.set(category);
  return category;
};

export const deleteCategory = async (categoryId: string, userId: string) => {
  if (!categoryId) {
    throw new Error("카테고리 ID가 필요합니다");
  }

  const category = await getCategoryById(categoryId);
  if (category.userId !== userId) {
    throw new Error("카테고리 삭제는 작성자만 가능합니다");
  }

  const tasksSnapshot = await adminDb.collection("tasks").where("categoryId", "==", categoryId).get();
  const batch = adminDb.batch();

  tasksSnapshot.docs.forEach((taskDoc) => {
    batch.delete(taskDoc.ref);
  });
  batch.delete(adminDb.collection("categories").doc(categoryId));

  await batch.commit();
};
