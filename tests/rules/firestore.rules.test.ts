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
  getDocs,
  or,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
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
    await setDoc(doc(db, 'categories', 'cat-family-null'), {
      name: 'Has familyId field but null',
      userId: OWNER_UID,
      familyId: null,
      createdAt: new Date(),
    });
    await setDoc(doc(db, 'categories', 'cat-family-ghost'), {
      name: 'Points to a non-existent family',
      userId: OWNER_UID,
      familyId: 'family-does-not-exist',
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

describe('categories: per-doc reads', () => {
  test('owner can read their own category', async () => {
    const db = testEnv.authenticatedContext(OWNER_UID).firestore();
    await assertSucceeds(getDoc(doc(db, 'categories', 'cat-owner-only')));
  });

  test('family member can read shared category', async () => {
    const db = testEnv.authenticatedContext(FAMILY_MEMBER_UID).firestore();
    await assertSucceeds(getDoc(doc(db, 'categories', 'cat-family')));
  });

  test('stranger cannot read another user category (owner-only or family)', async () => {
    const db = testEnv.authenticatedContext(STRANGER_UID).firestore();
    await assertFails(getDoc(doc(db, 'categories', 'cat-owner-only')));
    await assertFails(getDoc(doc(db, 'categories', 'cat-family')));
  });

  test('unauthenticated cannot read any category', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'categories', 'cat-owner-only')));
    await assertFails(getDoc(doc(db, 'categories', 'cat-family')));
  });
});

describe('categories: canAccess edge cases', () => {
  test('non-owner cannot read category whose familyId is null', async () => {
    // Rule short-circuits on `data.familyId != null`, so the doc must
    // resolve via isOwner(). A non-owner must be denied even though the
    // familyId field exists on the document.
    const db = testEnv.authenticatedContext(STRANGER_UID).firestore();
    await assertFails(getDoc(doc(db, 'categories', 'cat-family-null')));
  });

  test('non-owner cannot read category pointing to a non-existent family', async () => {
    // The recursive get() in isMember() reads a missing doc; the rule
    // must deny rather than throw open. STRANGER_UID is a member of
    // OTHER_FAMILY_ID, so being-a-family-member-of-something-else must
    // not grant access here.
    const db = testEnv.authenticatedContext(STRANGER_UID).firestore();
    await assertFails(getDoc(doc(db, 'categories', 'cat-family-ghost')));
  });
});

describe('categories: writes (all denied for clients)', () => {
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

  test('owner cannot update or delete their own category', async () => {
    const db = testEnv.authenticatedContext(OWNER_UID).firestore();
    await assertFails(
      updateDoc(doc(db, 'categories', 'cat-owner-only'), { name: 'Renamed' }),
    );
    await assertFails(deleteDoc(doc(db, 'categories', 'cat-owner-only')));
  });
});

describe('categories: list/query (production read path)', () => {
  // src/App.tsx subscribes via:
  //   query(coll, or(where('userId','==',uid), where('familyId','in',familyIds)),
  //         orderBy('createdAt','desc'))
  // Firestore evaluates rules per candidate doc as the listener streams,
  // so a query that could return a denied doc fails the entire listener.
  test('owner with no family can list their own categories', async () => {
    const db = testEnv.authenticatedContext(OWNER_UID).firestore();
    await assertSucceeds(
      getDocs(
        query(
          collection(db, 'categories'),
          where('userId', '==', OWNER_UID),
          orderBy('createdAt', 'desc'),
        ),
      ),
    );
  });

  test('family member can list categories via or() query', async () => {
    const db = testEnv.authenticatedContext(FAMILY_MEMBER_UID).firestore();
    await assertSucceeds(
      getDocs(
        query(
          collection(db, 'categories'),
          or(
            where('userId', '==', FAMILY_MEMBER_UID),
            where('familyId', 'in', [FAMILY_ID]),
          ),
          orderBy('createdAt', 'desc'),
        ),
      ),
    );
  });

  test('stranger cannot list categories of a family they do not belong to', async () => {
    const db = testEnv.authenticatedContext(STRANGER_UID).firestore();
    await assertFails(
      getDocs(
        query(
          collection(db, 'categories'),
          or(
            where('userId', '==', STRANGER_UID),
            where('familyId', 'in', [FAMILY_ID]),
          ),
          orderBy('createdAt', 'desc'),
        ),
      ),
    );
  });

  test('authenticated user cannot list the entire collection', async () => {
    const db = testEnv.authenticatedContext(OWNER_UID).firestore();
    await assertFails(getDocs(collection(db, 'categories')));
  });
});

describe('tasks: per-doc reads', () => {
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
});

describe('tasks: writes (all denied for clients)', () => {
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

describe('tasks: list/query (production read path)', () => {
  test('family member can list tasks via or() query (priority order)', async () => {
    const db = testEnv.authenticatedContext(FAMILY_MEMBER_UID).firestore();
    await assertSucceeds(
      getDocs(
        query(
          collection(db, 'tasks'),
          or(
            where('userId', '==', FAMILY_MEMBER_UID),
            where('familyId', 'in', [FAMILY_ID]),
          ),
          orderBy('priority', 'desc'),
        ),
      ),
    );
  });

  test('stranger cannot list tasks of a family they do not belong to', async () => {
    const db = testEnv.authenticatedContext(STRANGER_UID).firestore();
    await assertFails(
      getDocs(
        query(
          collection(db, 'tasks'),
          or(
            where('userId', '==', STRANGER_UID),
            where('familyId', 'in', [FAMILY_ID]),
          ),
          orderBy('priority', 'desc'),
        ),
      ),
    );
  });
});

describe('familyGroups', () => {
  test('member can read their family group', async () => {
    const db = testEnv.authenticatedContext(FAMILY_MEMBER_UID).firestore();
    await assertSucceeds(getDoc(doc(db, 'familyGroups', FAMILY_ID)));
  });

  test('member of a different family cannot read this family group', async () => {
    // STRANGER_UID is the sole member of OTHER_FAMILY_ID, so they are
    // authenticated and a family member elsewhere — but must not be
    // able to read FAMILY_ID's group.
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
  // Invite codes are bearer tokens; clients never query this collection.
  // The /family/join backend route validates codes via Admin SDK.
  test('authenticated user cannot read any invite', async () => {
    const db = testEnv.authenticatedContext(OWNER_UID).firestore();
    await assertFails(getDoc(doc(db, 'invites', 'invite-1')));
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
