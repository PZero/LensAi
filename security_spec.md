# Security Specification & Threat Model - Sviluppo Foto AI

This document establishes the Attribute-Based Access Control (ABAC) invariants, the "Dirty Dozen" rogue payloads, and the verified security rules for the Firestore database of "Sviluppo Foto AI".

## 1. Data Invariants

1. **User Profile (`/users/{userId}`)**
   - A user profile can only be created by the owner matching `request.auth.uid`.
   - The user cannot modify critical security configurations of other users.
   - The `geminiApiKey` can be stored and is private to the owner (only the owner can read/write it).

2. **Photos Metadata (`/photos/{photoId}`)**
   - Must contain reference to `userId` which must match `request.auth.uid`.
   - The owner is the only user who can create, update, or delete their photo.
   - A photo record contains: `status` ('scattata', 'descrivendo', 'descritto', 'sviluppando', 'completato'), `originalPhotoUrl`, `developedPhotoUrl`, `description`, etc.

3. **Custom Styles (`/styles/{styleId}`)**
   - Each style is created by a user (`userId` matching `request.auth.uid`).
   - Only the publisher can update or delete their custom style.
   - Other signed-in users can read public styles, or the system exposes styles. To safeguard privacy, we allow users to read styles where `userId == request.auth.uid` or where `public == true`.

4. **Presence (`/presence/{userId}`)**
   - Represents user online heartbeat.
   - Can only be written/updated by the user itself (`userId == request.auth.uid`).
   - Publicly readable to allow calculating the global online count.

---

## 2. The "Dirty Dozen" Vulnerability Targets

| Case | Document Node | Action | Attack Payload | Expected |
|---|---|---|---|---|
| 1 | `/users/attacker` | Create | `{ "userId": "attacker", "email": "victim@gmail.com", "geminiApiKey": "AIzaSy..." }` | ALLOW |
| 2 | `/users/victim` | Create/Write | `{ "userId": "victim", "geminiApiKey": "STOLEN" }` by Attacker | **DENIED** |
| 3 | `/users/victim` | Read | Fetch victim's profile and secret Gemini API Key by Attacker | **DENIED** |
| 4 | `/photos/photo1` | Create | `{ "photoId": "photo1", "userId": "victim", "status": "scattata" }` by Attacker | **DENIED** |
| 5 | `/photos/photo1` | Update | Set status of victim's photo to "completato" by Attacker | **DENIED** |
| 6 | `/photos/photo1` | Update | Change `userId` of own photo to escape ownership | **DENIED** |
| 7 | `/photos/photo1` | Update | Add arbitrary "Ghost Fields" (e.g. `isVerifiedAdmin: true`) | **DENIED** |
| 8 | `/styles/style1` | Create | `{ "styleId": "style1", "userId": "victim", "name": "Fake Tim Flach", "prompt": "..." }` by Attacker | **DENIED** |
| 9 | `/styles/style1` | Delete | Delete victim's style by Attacker | **DENIED** |
| 10| `/presence/victim` | Write | Spoof presence record of victim by Attacker | **DENIED** |
| 11| `/photos/photo1` | Create | `createdAt` or `updatedAt` set to a future/past client-supplied date | **DENIED** |
| 12| `/photos/photo1` | Read | Bullet-harvest reading all photos globally | **DENIED** (only owner can read list/get) |

---

## 3. Global Integrity & Rules Blueprint

The security rules are defined to:
1. Deny everything by default.
2. Ensure `request.auth.uid` matches the collection variables.
3. Guard parameters (types, sizes, formats).
4. Strictly check that `createdAt` and `updatedAt` use `request.time`.
