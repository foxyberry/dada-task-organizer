import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PROJECT_ID = 'dada-rules-test';
const OWNER_UID = 'owner-uid';
const FAMILY_MEMBER_UID = 'family-member-uid';
const STRANGER_UID = 'stranger-uid';
const FAMILY_ID = 'family-1';
const OTHER_FAMILY_ID = 'family-other';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'familyGroups', FAMILY_ID), {
      name: 'Park Family',
      ownerId: OWNER_UID,
      members: [OWNER_UID, FAMILY_MEMBER_UID],
      createdAt: new Date(),
    });
    await setDoc(doc(db, 'familyGroups', OTHER_FAMILY_ID), {
      name: 'Other Family',
      ownerId: STRANGER_UID,
      members: [STRANGER_UID],
      createdAt: new Date(),
    });
    await setDoc(doc(db, 'categories', 'cat-owner-only'), {
      name: 'Personal',
      userId: OWNER_UID,
      createdAt: new Date(),
    });
    await setDoc(doc(db, 'categories', 'cat-family'), {
      name: 'Shared',
      userId: OWNER_UID,
      familyId: FAMILY_ID,
      createdAt: new Date(),
    });
    await setDoc(doc(db, 'tasks', 'task-owner-only'), {
      title: 'Personal task',
      userId: OWNER_UID,
      categoryId: 'cat-owner-only',
      createdAt: new Date(),
    });
    await setDoc(doc(db, 'tasks', 'task-family'), {
      title: 'Shared task',
      userId: OWNER_UID,
      familyId: FAMILY_ID,
      categoryId: 'cat-family',
      createdAt: new Date(),
    });
    await setDoc(doc(db, 'invites', 'invite-1'), {
      familyId: FAMILY_ID,
      code: 'JOIN-CODE',
      expiresAt: new Date(Date.now() + 86_400_000),
      createdAt: new Date(),
    });
  });
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

describe('categories', () => {
  test('owner can read their own category', async () => {
    const db = testEnv.authenticatedContext(OWNER_UID).firestore();
    await assertSucceeds(getDoc(doc(db, 'categories', 'cat-owner-only')));
  });

  test('family member can read shared category', async () => {
    const db = testEnv.authenticatedContext(FAMILY_MEMBER_UID).firestore();
    await assertSucceeds(getDoc(doc(db, 'categories', 'cat-family')));
  });

  test('stranger cannot read another user category', async () => {
    const db = testEnv.authenticatedContext(STRANGER_UID).firestore();
    await assertFails(getDoc(doc(db, 'categories', 'cat-owner-only')));
  });

  test('unauthenticated cannot read any category', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'categories', 'cat-owner-only')));
    await assertFails(getDoc(doc(db, 'categories', 'cat-family')));
  });

  test('authenticated user cannot create a category', async () => {
    const db = testEnv.authenticatedContext(OWNER_UID).firestore();
    await assertFails(
      addDoc(collection(db, 'categories'), {
        name: 'Hacked',
        userId: OWNER_UID,
        createdAt: new Date(),
      }),
    );
  });

  test('owner cannot update their own category', async () => {
    const db = testEnv.authenticatedContext(OWNER_UID).firestore();
    await assertFails(
      updateDoc(doc(db, 'categories', 'cat-owner-only'), { name: 'Renamed' }),
    );
  });

  test('owner cannot delete their own category', async () => {
    const db = testEnv.authenticatedContext(OWNER_UID).firestore();
    await assertFails(deleteDoc(doc(db, 'categories', 'cat-owner-only')));
  });
});

describe('tasks', () => {
  test('owner can read their own task', async () => {
    const db = testEnv.authenticatedContext(OWNER_UID).firestore();
    await assertSucceeds(getDoc(doc(db, 'tasks', 'task-owner-only')));
  });

  test('family member can read shared task', async () => {
    const db = testEnv.authenticatedContext(FAMILY_MEMBER_UID).firestore();
    await assertSucceeds(getDoc(doc(db, 'tasks', 'task-family')));
  });

  test('stranger cannot read another user task', async () => {
    const db = testEnv.authenticatedContext(STRANGER_UID).firestore();
    await assertFails(getDoc(doc(db, 'tasks', 'task-owner-only')));
    await assertFails(getDoc(doc(db, 'tasks', 'task-family')));
  });

  test('unauthenticated cannot read any task', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'tasks', 'task-owner-only')));
  });

  test('authenticated user cannot create a task', async () => {
    const db = testEnv.authenticatedContext(OWNER_UID).firestore();
    await assertFails(
      addDoc(collection(db, 'tasks'), {
        title: 'Injected task',
        userId: OWNER_UID,
        categoryId: 'cat-owner-only',
        createdAt: new Date(),
      }),
    );
  });

  test('owner cannot update or delete their own task', async () => {
    const db = testEnv.authenticatedContext(OWNER_UID).firestore();
    await assertFails(
      updateDoc(doc(db, 'tasks', 'task-owner-only'), { title: 'Edited' }),
    );
    await assertFails(deleteDoc(doc(db, 'tasks', 'task-owner-only')));
  });
});

describe('familyGroups', () => {
  test('member can read their family group', async () => {
    const db = testEnv.authenticatedContext(FAMILY_MEMBER_UID).firestore();
    await assertSucceeds(getDoc(doc(db, 'familyGroups', FAMILY_ID)));
  });

  test('non-member cannot read a family group', async () => {
    const db = testEnv.authenticatedContext(STRANGER_UID).firestore();
    await assertFails(getDoc(doc(db, 'familyGroups', FAMILY_ID)));
  });

  test('unauthenticated cannot read any family group', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'familyGroups', FAMILY_ID)));
  });

  test('member cannot write to family group', async () => {
    const db = testEnv.authenticatedContext(OWNER_UID).firestore();
    await assertFails(
      updateDoc(doc(db, 'familyGroups', FAMILY_ID), { name: 'Renamed' }),
    );
    await assertFails(deleteDoc(doc(db, 'familyGroups', FAMILY_ID)));
  });

  test('authenticated user cannot create a family group', async () => {
    const db = testEnv.authenticatedContext(OWNER_UID).firestore();
    await assertFails(
      addDoc(collection(db, 'familyGroups'), {
        name: 'New Family',
        ownerId: OWNER_UID,
        members: [OWNER_UID],
        createdAt: new Date(),
      }),
    );
  });
});

describe('invites', () => {
  // Current rule: read allowed for any authenticated user, write denied.
  // If this is tightened to `read: if false`, flip the first test to assertFails.
  test('authenticated user can read invites (matches current rule)', async () => {
    const db = testEnv.authenticatedContext(OWNER_UID).firestore();
    await assertSucceeds(getDoc(doc(db, 'invites', 'invite-1')));
  });

  test('unauthenticated cannot read any invite', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'invites', 'invite-1')));
  });

  test('authenticated user cannot create or modify an invite', async () => {
    const db = testEnv.authenticatedContext(OWNER_UID).firestore();
    await assertFails(
      addDoc(collection(db, 'invites'), {
        familyId: FAMILY_ID,
        code: 'NEW-CODE',
        createdAt: new Date(),
      }),
    );
    await assertFails(
      updateDoc(doc(db, 'invites', 'invite-1'), { code: 'TAMPERED' }),
    );
    await assertFails(deleteDoc(doc(db, 'invites', 'invite-1')));
  });
});
