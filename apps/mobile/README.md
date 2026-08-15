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
- Mock data only

Backend connectivity, authentication, charting, and AI features are intentionally not included yet.
