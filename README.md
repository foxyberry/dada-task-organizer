# Dada Task Organizer

This contains everything you need to run your app locally.

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Copy the example environment file:
   `cp .env.example .env.local`
3. Set `GEMINI_API_KEY`, `FIREBASE_SERVICE_ACCOUNT`, and the `VITE_FIREBASE_*` values in `.env.local`.
4. Run the app:
   `npm run dev`

The local server defaults to port `5001`. To use a different port:

`PORT=5002 npm run dev`

## Firestore

This project uses a named Firestore database. Set both backend and frontend database IDs:

```bash
FIREBASE_FIRESTORE_DATABASE_ID="MY_FIRESTORE_DATABASE_ID"
VITE_FIREBASE_FIRESTORE_DATABASE_ID="MY_FIRESTORE_DATABASE_ID"
```

Deploy Firestore rules:

```bash
firebase deploy --only firestore:rules --project ai-task-organizer-3de8d
```

## Firebase Auth

For local Google sign-in, add `localhost` to Firebase Console > Authentication > Settings > Authorized domains.

Also enable Google in Firebase Console > Authentication > Sign-in method.
