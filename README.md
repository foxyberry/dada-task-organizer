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

## Firebase Auth

For local Google sign-in, add `localhost` to Firebase Console > Authentication > Settings > Authorized domains.

Also enable Google in Firebase Console > Authentication > Sign-in method.
