import { adminAuth, adminDb } from "../firebaseAdmin.js";
import logger from "../utils/logger.js";
import type { DocumentReference } from "firebase-admin/firestore";

const BATCH_LIMIT = 499;

async function deleteInBatches(refs: DocumentReference[]): Promise<void> {
  const db = adminDb;
  for (let i = 0; i < refs.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    refs.slice(i, i + BATCH_LIMIT).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
}

export const deleteUserAccount = async (userId: string): Promise<void> => {
  const db = adminDb;

  // 1. Family groups where this user is the owner → delete entirely
  const ownedFamilies = await db
    .collection("familyGroups")
    .where("ownerId", "==", userId)
    .get();

  for (const familyDoc of ownedFamilies.docs) {
    const familyId = familyDoc.id;

    const invites = await db
      .collection("invites")
      .where("familyId", "==", familyId)
      .get();
    await deleteInBatches([...invites.docs.map((d) => d.ref), familyDoc.ref]);

    logger.info({ familyId, userId }, "Deleted owned family group");
  }

  // 2. Family groups where this user is a member (but not owner) → remove from members
  const memberFamilies = await db
    .collection("familyGroups")
    .where("members", "array-contains", userId)
    .get();

  for (const familyDoc of memberFamilies.docs) {
    const data = familyDoc.data();
    if (data.ownerId !== userId) {
      await familyDoc.ref.update({
        members: data.members.filter((m: string) => m !== userId),
      });
    }
  }

  // 3. Delete all categories owned by user
  const categories = await db
    .collection("categories")
    .where("userId", "==", userId)
    .get();
  await deleteInBatches(categories.docs.map((d) => d.ref));

  // 4. Delete all tasks owned by user
  const tasks = await db
    .collection("tasks")
    .where("userId", "==", userId)
    .get();
  await deleteInBatches(tasks.docs.map((d) => d.ref));

  // 5. Delete Firebase Auth user last so the earlier steps still have auth context
  await adminAuth.deleteUser(userId);

  logger.info({ userId }, "User account deleted");
};
