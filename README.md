# SI Portal

Frontend for the **Burger Singh Suggestive Indent (SI) Portal** — an authenticated ops tool franchise stores use to review, edit, and lock the day's stock indents.

Built with **Expo + React Native + react-native-web**, primary target is **desktop web**; tablet/mobile layouts remain viable because RN primitives don't lock us in.

---

## Quick start

```bash
pnpm install
cp .env.example .env
# edit .env to point at your NestJS backend if it's not on localhost:3001

pnpm dev:web          # web at http://localhost:8081
# or
pnpm start            # Expo dev menu — pick a target
```

The backend is a separate NestJS Fastify service (not in this repo). It must be reachable at whatever `EXPO_PUBLIC_API_URL` points to.

---

## Stack

| Layer            | Choice                                                             |
|------------------|--------------------------------------------------------------------|
| UI framework     | Expo ~55 + React Native + react-native-web                         |
| Routing          | Expo Router ~7 (file-based, typed routes)                          |
| State            | TanStack Query v5 (server) + React Context (theme / auth)          |
| Language         | TypeScript                                                         |
| Auth storage     | `expo-secure-store` (native), `AsyncStorage` (web)                 |
| API              | Fetch wrapper → NestJS at `EXPO_PUBLIC_API_URL`                    |
| Design language  | Ported 1:1 from `bs-franchise-app-design` (BS FA)                  |

---

## Layout

```
app/                              Expo Router file-based routes
  _layout.tsx                     QueryClient + Theme + Auth providers
  index.tsx                       redirect → /sis
  login.tsx                       email/password sign-in
  (app)/_layout.tsx               auth guard + AppShell
  (app)/sis/index.tsx             SI list (landing)
  (app)/sis/generate.tsx          multi-store generate
  (app)/sis/[id].tsx              SI detail (draft + locked)
  (app)/exceptions.tsx            cross-store exceptions feed
  (app)/discrepancies.tsx         mapping cleanup

src/
  api/
    client.ts                     REST client with JWT header
    types.ts                      shared TS types
  auth/AuthContext.tsx            session hydration, sign-in / sign-out
  components/
    AppShell.tsx                  persistent top bar (nav + user menu)
    MultiSelectPill.tsx           canonical checkbox popover
    ui.tsx                        Button/Chip/Card/Field/Screen/…
  theme/
    tokens.ts                     colors (light+dark), spacing, radius, fonts
    ThemeContext.tsx              mode toggle + palette hook
  utils/
    csv.ts                        buildCsv + downloadCsv
    format.ts                     shortDay / shortDayYear / refreshedAt
```

---

## Design language

Ported from BS FA's `DESIGN_LANGUAGE.md`. Every rule enforced:

- **Inter** everywhere. No Plus Jakarta, no Geist.
- **ONE traffic-light scale** — Green / Yellow / Red / Slate. The word is *yellow*, not amber.
- Every surface has a **light + dark** variant via `useTheme().c`.
- Tables use compact "D MMM" dates in cells; ISO in exports.
- Multi-select filters use the checkbox popover, showing every selected label — never "N selected".
- Every SectionCard has an active-filter chip strip when filters are on.
- Destructive actions require a confirm dialog with a clear one-line description.
- No hardcoded hex in a component file. Import from `src/theme/tokens.ts`.

---

## API contract

Every endpoint is `POST`/`GET` under the base URL, authenticated by `Authorization: Bearer <jwt>`.

| Endpoint                                | Purpose                                       |
|-----------------------------------------|-----------------------------------------------|
| `POST /auth/login`                      | email/password → JWT                          |
| `GET  /stores`                          | outlets scoped to the signed-in user          |
| `GET  /sis?runDate=&storeIds=&status=`  | SI list                                       |
| `GET  /sis/:id`                         | SI detail (lines + exceptions)                |
| `PATCH /sis/:id/lines`                  | batch save edited quantities                  |
| `POST /sis/:id/lock`                    | finalise draft                                |
| `DELETE /sis/:id`                       | delete draft only                             |
| `POST /sis/generate`                    | multi-store generate                          |
| `GET  /exceptions?runDate=&types=`      | cross-store exceptions feed                   |
| `GET  /discrepancies?runDate=&types=`   | UNMAPPED + MISSING_CONVERSION                 |

Types live in `src/api/types.ts`. Field names are frozen; enums are lowercase.

---

## What's out of scope for v1

- Auto-push of locked SIs into Rista (human still submits manually).
- Daily cron / load-gate admin console.
- User–store access admin screens.
- Mobile-first polish (desktop is primary; mobile compiles but hasn't been visually audited).

---

## What's next

1. **Backend integration** — replace mock responses with live NestJS.
2. **Component states catalogue** — a route that renders every chip / row / dialog state side by side for QA.
3. **Native builds** — the web bundle works; iOS/Android need `expo run:ios` / `run:android` verification.
4. **Auth SSO** — wire `Continue with Google` once backend confirms the OIDC flow.

---

_Design ported from the design reference files (SiListFrame.dc.html + SI Portal.dc.html). Design language ported from BS FA (`bs-franchise-app-design`)._
