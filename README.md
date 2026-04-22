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

## Firebase Admin Credentials

The backend uses Firebase Admin SDK to verify ID tokens and access Firestore for server routes.

Set these backend environment variables:

```bash
FIREBASE_PROJECT_ID="MY_FIREBASE_PROJECT_ID"
FIREBASE_FIRESTORE_DATABASE_ID="MY_FIRESTORE_DATABASE_ID"
```

For local development, choose one credential mode:

```bash
# Option 1: use Application Default Credentials
gcloud auth application-default login

# Option 2: point to a local service account file
FIREBASE_SERVICE_ACCOUNT="/absolute/path/to/service-account.json"

# Option 3: provide the service account JSON string
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'
```

For production on Google Cloud, prefer Application Default Credentials from the runtime service account instead of storing service account JSON in an environment variable. The runtime service account needs permission to verify Firebase Auth tokens and read/write the configured Firestore database.

## Firebase Auth

For local Google sign-in, add `localhost` to Firebase Console > Authentication > Settings > Authorized domains.

Also enable Google in Firebase Console > Authentication > Sign-in method.
