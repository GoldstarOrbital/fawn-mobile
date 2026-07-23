# FAWN Mobile

Expo React Native app for the FAWN iOS path — wired to the **live** FAWN
backend (custodial USDC payments), the same API the web app uses.

## What Exists (all against live endpoints)

- Expo Router app shell with dark FAWN theme tokens
- Welcome, login, signup, dashboard, send, campus, and settings screens
- API client pointed at `https://web-production-13d5b.up.railway.app`
- Auth provider using `expo-secure-store` for returned JWTs, with bootstrap
  from SecureStore on app start
- Signup matched to the real `POST /auth/register` contract: name, email,
  password, optional phone/school, student flag — **no SSN, no KYC fields**
  (FAWN is a custodial USDC wallet, not a bank account)
- Dashboard wired to `GET /auth/me` + `GET /wallet/balance` +
  `GET /transfers/history`, including one-tap custodial wallet creation
  (`POST /auth/wallets/create`) for fresh accounts
- Real Send flow: recipient can be a FAWN `@username` ($0.01 fee) or any
  `0x…` address ($0.50 fee), with live username lookup
  (`GET /accounts/check-username/{u}`), fee + total preview, a confirm step,
  and `POST /transfers/send-unified` for settlement; review-held sends are
  surfaced honestly
- Settings logout wired to the auth provider
- `eas.json` build profiles (development/preview/production)

The Campus tab is a static visual preview of the campus-savings layer; the
live version ships in the web app today.

## Run Locally

```powershell
npm install
npm run typecheck
npx expo start
```

## Current Validation

`npm run typecheck` passes.

`npm audit` reports moderate transitive advisories through Expo CLI
dependencies. The automated force fix would downgrade Expo and should not be
applied without a deliberate Expo SDK version decision.

## Next Build Steps

- Receive screen (wallet address + QR) to match the web app
- Campus tab wired to `GET /deals/schools` (live data, not the static preview)
- App icon, splash screen, and privacy labels (mascot art lives in
  `fawn-frontend/assets/`)

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
   App Privacy questionnaire (collects: email, name, optional phone/school —
   be accurate, Apple rejects mismatches), screenshots, and a financial-app
   review note describing the custodial USDC model honestly.
