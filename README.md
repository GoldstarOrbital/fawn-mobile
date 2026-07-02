# FAWN Mobile

Expo React Native starter for the FAWN iOS path.

## What Exists

- Expo Router app shell
- Dark FAWN theme tokens
- Welcome, login, signup, dashboard, campus, and settings screens
- Railway API client pointed at `https://web-production-13d5b.up.railway.app`
- Auth provider using `expo-secure-store` for returned JWTs
- Signup fields aligned with the current backend KYC contract: email, password, legal name, phone, DOB, SSN, address, school, location, and military status
- Auth bootstrapping from SecureStore on app start
- Dashboard refresh wired to `/accounts/dashboard`
- Settings logout wired to the auth provider
- Real P2P Send tab: handle lookup, live send-limit headroom (`GET /p2p/limits`),
  idempotency-keyed create, step-up/scam-warning confirm screen, instant
  Book Payment settlement on success
- `eas.json` build profiles (development/preview/production)

## Run Locally

```powershell
npm install
npm run typecheck
npx expo start
```

## Current Validation

`npm run typecheck` passes.

`npm audit` reports moderate transitive advisories through Expo CLI dependencies. The automated force fix would downgrade Expo and should not be applied without a deliberate Expo SDK version decision.

## Next Build Steps

- Add a mobile bootstrap endpoint for user, account, deals, and feature flags.
- Replace the card placeholder with real authenticated queries (P2P Send is done).
- Add a compliant production KYC handoff if FAWN moves from direct SSN collection to Unit hosted onboarding.
- App icon, splash screen, and privacy labels.

## iOS Launch Path (requires Alex — cannot be automated from this machine)

Everything below needs an Apple Developer account ($99/yr) and interactive
logins, so it's a human checklist, in order:

1. Enroll at developer.apple.com (personal or org — org needs a DUNS number).
2. `npm i -g eas-cli && eas login` (create a free Expo account if needed).
3. `eas build --platform ios --profile preview` — EAS builds in Expo's cloud,
   so no Mac is required; it walks you through generating Apple certs the
   first time.
4. Install the preview build on your iPhone via the QR/link EAS prints.
5. When it looks right: `eas build --platform ios --profile production`
   then `eas submit --platform ios` to push to TestFlight.
6. App Store listing needs: privacy policy URL (host on the landing site),
   App Privacy questionnaire (collects: email, name, phone, DOB, SSN for
   KYC — be accurate, Apple rejects mismatches), screenshots, and a
   financial-app review note explaining the Unit sandbox status honestly.

Note: App Review is unlikely to approve a banking app that's still on a
sandbox banking backend for public release. TestFlight (internal testing)
is the realistic target until Unit production approval lands.
