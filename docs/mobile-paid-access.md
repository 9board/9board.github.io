# Mobile paid access gate

## Behavior
Only a signed-in Firebase Authentication user whose server-confirmed Firestore `users/{uid}` document has boolean `paid === true` can access Billiards_layout_mobile. Missing documents, false/missing/malformed paid values, cached snapshots, pending writes, permission errors, authentication errors, SDK failures and purchase confirmation timeout remain locked. The admin flag is never consulted.

The existing Google login, layout/editor code, score clock, landscape code and Free/Plus plan limits are preserved. This change controls entry to the mobile application; it does not activate additional Plus capabilities. It adds purchase/recheck/account-switch actions to the existing gate, preserves the supplied Stripe URL, blocks keyboard/pointer access with inert, and hides editor content before confirmation. Auth changes cancel the old listener and invalidate stale callbacks. Server-side paid revocation or document deletion relocks the editor without removing its DOM or local data.

Purchase observations use onSnapshot with includeMetadataChanges. Only confirmed server snapshots unlock; no Firestore client writes or local purchase flags are used. A 15-second wait displays a recoverable confirmation error. Recheck starts a fresh subscription. Cached snapshots never unlock offline.

## Firebase prerequisites and verification limits
The existing GitHub source uses Firebase project `board-53117`, Google Authentication and Firebase Web SDK 12.19.0. Keep Google sign-in enabled and the production domain authorized.

No firestore.rules file was found at the repository root. The deployed console rules, current plan, Emika UID and live purchase document were not accessible or independently verified in this task. The reported rule premise is: signed-in users can read only their own document; all client writes and other document access are denied. The minimal matching rules are:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow write: if false;
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

This is a reference, not a deployed rule change. Broad allow rules elsewhere are additive and must not bypass this policy. Validate in the Firebase console/Rules Playground: own document read allowed, other UID and unauthenticated reads denied, all client create/update/delete denied. The Emika exception must be represented by paid=true in users/{her actual Firebase UID}; an email-address document ID or admin=true alone does not qualify.

The application is a static GitHub Pages client. This gate cannot prevent a user from modifying their browser's JavaScript or copying public client code. Future protected server resources require server-side entitlement checks and rules of their own.

## Validation
Browser tests use the actual mobile HTML and application scripts, with Firebase modules replaced by controllable test doubles. Verified: initial lock; strict boolean paid validation; missing document; revocation; cached and pending snapshots; permission failure; retry; account changes; stale callback rejection; subscription cleanup; logout; auth observer failure; timeout; SDK load failure; purchase URL; inert editor; landscape gate visibility; existing ball placement after unlocking. Browser page errors were absent. JavaScript syntax check passed. Direct comparison confirmed the existing editor inline script and the second services IIFE were unchanged; index.html differs only in the pre-auth visibility guard and script version.

Run from the repository root with Node.js, Playwright and Microsoft Edge installed:
```
node tests/mobile-paid-gate.cjs
```
The test writes paid-mobile.png and unpaid-mobile.png into tests/. It does not log in to Firebase, make a purchase, write Firestore or change production settings. Real Google login, deployed rule enforcement and live paid documents still need production verification before release.

## Explicitly unfinished: payment fulfillment
Stripe Webhook / Cloud Functions are not implemented. A successful Payment Link payment does not automatically set users/{uid}.paid, and returning from Stripe never unlocks the application. Until trusted backend fulfillment is ready, entitlement must be set through trusted administration.

A separate task must upgrade Firebase to Blaze for Cloud Functions deployment, reliably associate checkout with an authenticated UID, verify Stripe webhook signatures, handle delivery retries/idempotency, and write paid=true using a server-side Admin SDK. Do not infer entitlement from an email match, redirect query parameter or client-side payment success.

References:
- https://firebase.google.com/docs/firestore/query-data/listen
- https://firebase.google.com/docs/firestore/security/rules-conditions
- https://firebase.google.com/docs/functions/get-started

## Account choice after explicit logout
Successful user-initiated logout (Settings logout or the gate's account-switch action) sets a sessionStorage flag, with an in-memory fallback if storage is unavailable. The next login creates a fresh GoogleAuthProvider and requests prompt=select_account. Normal login and automatic auth state changes do not set this flag. Successful popup sign-in consumes it; cancellation retains it. Session storage preserves the choice request across a same-tab reload. Failed logout does not create a request. Account deletion and reauthentication do not set or inherit the chooser parameter.

Browser tests verify normal/automatic logout behavior, both explicit logout actions, cancellation, same-tab reload, consumption after successful login, and failed logout. Firebase/Google OAuth is mocked; the actual Google chooser UI still requires production verification.

Google provider custom parameters: https://firebase.google.com/docs/auth/web/google-signin
