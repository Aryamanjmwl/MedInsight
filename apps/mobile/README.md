# MedInsight Mobile

Cross-platform MedInsight client shell built with Expo, React Native, TypeScript, and Expo Router.

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the development server

   ```bash
   npm start
   ```

Use `npm run android`, `npm run ios` (macOS required), or `npm run web` for a target platform.

## API configuration

Copy `.env.example` to a local environment file and configure the backend plus
the public Supabase project values:

```text
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
```

The web client falls back to this local URL when the variable is omitted. Native clients require an explicit URL because `127.0.0.1` may refer to the emulator or device itself. `EXPO_PUBLIC_*` variables are included in the public client bundle, so never store secrets, tokens, keys, or credentials in them.

The anon/publishable key is intended for public client configuration; it is not
the Supabase service-role secret. Never add a service-role key, database
password, private JWT signing material, or OpenAI key to the Expo environment.

Supabase owns email/password identity and session issuance. MedInsight persists
the session in Expo SecureStore on Android/iOS and supported browser storage on
web. The centralized API client adds the current access token to protected
backend requests. Signing out unmounts the user-keyed application providers so
report, dashboard, biomarker, brief, upload, and AI component state cannot cross
into the next account.

## PDF report upload

The client can select one PDF on web, Android, or iOS and send it to
`POST /reports/process-and-save` as multipart form data. Reports are limited to
10 MiB. Uploading requires an authenticated session and a reachable MedInsight
backend. The server derives report ownership from the verified token rather than
from client-supplied identity.

## Validation

```bash
npm run typecheck
npx expo install --check
npx expo export --platform web
```

## Current scope

- Dashboard, reports, biomarkers, and settings routes
- Mobile bottom-tab navigation
- Responsive web support
- Real dashboard, reports, and biomarker data
- PDF processing and saved-report upload
- Ephemeral, contextual AI explanations for individual saved biomarkers
- Refresh-aware Doctor Visit Brief for factual appointment preparation

Scanned-report OCR is performed locally by the configured backend when needed;
the client does not call a cloud OCR service. AI provider credentials remain on
the backend and explanation responses are not stored by the client.
Email/password authentication, guarded routes, persistent sessions, and sign-out
are included. Social login, MFA, password-reset UI, profiles, and roles remain
outside the current scope.
