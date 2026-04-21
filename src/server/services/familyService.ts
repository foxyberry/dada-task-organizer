import { adminDb } from "../firebaseAdmin.js";
import { v4 as uuidv4 } from "uuid";
import { handleFirestoreError } from "../utils/errorHandlers.js";

export const createFamilyWithInvite = async (ownerId: string, name: string) => {
  try {
    const familyRef = adminDb.collection("familyGroups").doc();
    const familyData = {
      id: familyRef.id,
      name,
      ownerId,
      members: [ownerId],
      createdAt: new Date().toISOString(),
    };

    await familyRef.set(familyData);

    // Generate an initial invite code for the group
    const invite = await generateInviteCode(familyRef.id);
    
    return { family: familyData, invite };
  } catch (error) {
    return handleFirestoreError(error, 'create', 'familyGroups', ownerId);
  }
};

export const generateInviteCode = async (familyId: string) => {
  // Simple 6-character alphanumeric code
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

  const inviteRef = adminDb.collection("invites").doc();
  const inviteData = {
    id: inviteRef.id,
    familyId,
    code,
    expiresAt: expiresAt.toISOString(),
    createdAt: new Date().toISOString(),
  };

  await inviteRef.set(inviteData);
  return inviteData;
};

export const joinFamilyGroup = async (userId: string, code: string) => {
  const invitesSnapshot = await adminDb
    .collection("invites")
    .where("code", "==", code.toUpperCase())
    .limit(1)
    .get();

  if (invitesSnapshot.empty) {
    throw new Error("Invalid invite code");
  }

  const inviteDoc = invitesSnapshot.docs[0];
  const inviteData = inviteDoc.data();

  if (new Date(inviteData.expiresAt) < new Date()) {
    throw new Error("Invite code has expired");
  }

  const familyRef = adminDb.collection("familyGroups").doc(inviteData.familyId);
  const familyDoc = await familyRef.get();

  if (!familyDoc.exists) {
    throw new Error("Family group no longer exists");
  }

  const familyData = familyDoc.data();
  if (familyData?.members.includes(userId)) {
    return familyData; // Already a member
  }

  await familyRef.update({
    members: [...(familyData?.members || []), userId],
  });

  return { ...familyData, members: [...(familyData?.members || []), userId] };
};

export const getFamilyGroup = async (familyId: string) => {
  const familyDoc = await adminDb.collection("familyGroups").doc(familyId).get();
  if (!familyDoc.exists) return null;
  return familyDoc.data();
};

export const getUserFamilyGroups = async (userId: string) => {
  try {
    const snapshot = await adminDb
      .collection("familyGroups")
      .where("members", "array-contains", userId)
      .get();

    return snapshot.docs.map((doc) => doc.data());
  } catch (error) {
    return handleFirestoreError(error, 'list', 'familyGroups', userId);
  }
};
