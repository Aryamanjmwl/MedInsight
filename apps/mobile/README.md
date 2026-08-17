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

Copy `.env.example` to a local environment file and set `EXPO_PUBLIC_API_URL` to the backend base URL. For local web development, the example value is:

```text
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000
```

The web client falls back to this local URL when the variable is omitted. Native clients require an explicit URL because `127.0.0.1` may refer to the emulator or device itself. `EXPO_PUBLIC_*` variables are included in the public client bundle, so never store secrets, tokens, keys, or credentials in them.

## PDF report upload

The client can select one PDF on web, Android, or iOS and send it to
`POST /reports/process-and-save` as multipart form data. Reports are limited to
10 MiB. Uploading requires a reachable MedInsight backend and does not require
client-side secrets.

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

Scanned-report OCR is performed locally by the configured backend when needed;
the client does not call a cloud OCR service. AI provider credentials remain on
the backend and explanation responses are not stored by the client.
Authentication is intentionally not included yet.
