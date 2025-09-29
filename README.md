# React + TypeScript + Vite

[![CI](https://github.com/hammermaps/TWS-App/actions/workflows/ci.yml/badge.svg)](https://github.com/hammermaps/TWS-App/actions/workflows/ci.yml)

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## CI / CD

This repository includes example GitHub Actions workflows for continuous integration and deployment. Files live in `.github/workflows/`:

- `ci.yml` — Runs on pushes and PRs to `main`, installs deps, runs lint (optional) and builds the web (`dist/`) and uploads it as an artifact.
- `deploy_netlify.yml` — Builds and deploys the `dist/` folder to Netlify using `netlify/actions/cli`.
- `deploy_vercel.yml` — Builds and deploys to Vercel using the `amondnet/vercel-action`.
- `android-build.yml` — Builds the Android native project (uses Capacitor). Optionally uses a keystore provided via secrets to sign the build and uploads produced APK/AAB artifacts.
- `publish_play_store.yml` — Template workflow that builds an Android bundle and uploads it to Google Play using a service account JSON stored in GitHub Secrets.

### Required GitHub Secrets

Set the following repository secrets in GitHub (Repository -> Settings -> Secrets & variables -> Actions) depending on which workflows you intend to use:

General / Web deploys:
- `NETLIFY_AUTH_TOKEN` — Netlify personal access token.
- `NETLIFY_SITE_ID` — Netlify site id to deploy to.
- `VERCEL_TOKEN` — Vercel personal token.
- `VERCEL_ORG_ID` — Vercel organization id.
- `VERCEL_PROJECT_ID` — Vercel project id.

Android / Play Store (optional):
- `ANDROID_KEYSTORE_BASE64` — base64 encoded keystore file (optional; used to sign release builds).
- `KEYSTORE_PASSWORD` — password for the keystore.
- `KEY_ALIAS` — key alias inside the keystore.
- `KEY_PASSWORD` — key password.
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` — JSON contents of a Google Play service account (for upload); store as secret string.
- `PLAY_PACKAGE_NAME` — The application id / package name for Play (e.g. `com.example.twsapp`).
- `PLAY_TRACK` — (optional) release track: `internal`, `alpha`, `beta`, `production` (defaults to `internal`).

Notes on security: never commit keystore files or service-account JSON into the repository. Use GitHub Secrets.

### How the workflows work (quick runbook)

- CI (build + lint): runs automatically on push/PR to `main`. You can view logs under the Actions tab.

- Deploy to Netlify: requires `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID`. The workflow runs `npm ci` and `npm run build:web` then `netlify deploy --dir=dist --prod --site $NETLIFY_SITE_ID`.

- Deploy to Vercel: requires `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. The action will run `npm ci`, `npm run build:web` and deploy using the Vercel Action.

- Android Build / Publish: The workflows build web assets, sync to Capacitor Android, and run Gradle to produce APK/AAB. If you provide a keystore via secrets, the workflows create `android/app/keystore.jks` and a `keystore.properties` file so Gradle can sign the release. The `publish_play_store.yml` action expects `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` and uses `r0adkll/upload-google-play` to upload the bundle.

### Commands you can run locally (copy & paste)

Install dependencies:

```bash
npm ci
```

Run dev server:

```bash
npm run dev
```

Build web (production):

```bash
npm run build:web
```

Build Android locally (requires Android SDK & JDK):

```bash
npm run build:web
npx cap sync android
npx cap open android
# Then build/run from Android Studio
```

Generate icons (PNG) from SVG sources:

```bash
npm run generate:icons
```

### Troubleshooting & tips

- If a CI job fails due to native dependency builds (e.g. `sharp`), ensure the runner has the required build tools. On `ubuntu-latest` `sharp` typically works fine; if you see errors, add `libvips` or try a `--ignore-scripts` install and use a prebuilt binary strategy.

- For Play Store publishing, if you use Google Play App Signing, use the SHA‑256 fingerprint from the Play Console to populate `assetlinks.json` for TWA.

- Review the GitHub Actions run logs (Actions tab) for full stdout/stderr when debugging failing builds.

If you want, I can also:
- Add an action badge for CI to the README.
- Provide a non-interactive Bubblewrap init helper (needs a public manifest URL).
- Add a workflow that automatically tags releases and publishes Play Store releases on Git tags.
