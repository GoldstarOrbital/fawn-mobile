# FAWN Mobile

Expo React Native starter for the FAWN iOS path.

## What Exists

- Expo Router app shell
- Dark FAWN theme tokens
- Welcome, login, signup, dashboard, campus, and settings screens
- Railway API client pointed at `https://web-production-13d5b.up.railway.app`
- Auth provider using `expo-secure-store` for returned JWTs
- Signup fields for email, password, school, location, and military status

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

- Confirm backend signup accepts `school`, `location`, and `military_status`.
- Add a mobile bootstrap endpoint for user, account, deals, and feature flags.
- Replace dashboard/card/P2P placeholders with real authenticated queries.
- Configure EAS, Apple Developer credentials, app icon, privacy labels, and TestFlight metadata.
