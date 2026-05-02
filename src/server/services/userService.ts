import { adminAuth, adminDb } from "../firebaseAdmin.js";
import logger from "../utils/logger.js";

export const deleteUserAccount = async (userId: string): Promise<void> => {
  const db = adminDb;

  // 1. Family groups where this user is the owner → delete entirely
  const ownedFamilies = await db
    .collection("familyGroups")
    .where("ownerId", "==", userId)
    .get();

  for (const familyDoc of ownedFamilies.docs) {
    const familyId = familyDoc.id;

    // Delete all invites for this family
    const invites = await db
      .collection("invites")
      .where("familyId", "==", familyId)
      .get();
    const batch = db.batch();
    invites.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(familyDoc.ref);
    await batch.commit();

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

  const catBatch = db.batch();
  categories.docs.forEach((d) => catBatch.delete(d.ref));
  await catBatch.commit();

  // 4. Delete all tasks owned by user
  const tasks = await db
    .collection("tasks")
    .where("userId", "==", userId)
    .get();

  const taskBatch = db.batch();
  tasks.docs.forEach((d) => taskBatch.delete(d.ref));
  await taskBatch.commit();

  // 5. Delete Firebase Auth user last so the earlier steps still have auth context
  await adminAuth.deleteUser(userId);

  logger.info({ userId }, "User account deleted");
};
