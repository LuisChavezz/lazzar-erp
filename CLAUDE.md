# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start development server
npm run build      # Production build
npm run lint       # ESLint (flat config, next/core-web-vitals + next/typescript)
npm run typecheck  # tsc --noEmit
```

No test runner exists — there are no test files or testing frameworks in this project. `npm run lint` accepts paths (`npm run lint -- src/features/quotes`) to check a single feature.

Additional docs in the repo root: `README.md` (setup), `ARQUITECTURA.md` (folder/layout tour), `GUIA_DE_USUARIO.md` (functional walkthrough of each module). All three are in Spanish.

## Architecture Overview

This is a Next.js 16 App Router ERP frontend. All business data lives in an external Django REST API at `NEXT_PUBLIC_API_URL`; the app is purely a UI client.

**The Next.js server cannot reach the backend on the user's behalf.** Auth is cookie-based on the *backend's* domain, so `auth-jwt` / `auth-refresh-jwt` are never attached to server-side fetches — only the browser can call the API authenticated. Consequence: data fetching lives in client hooks, and Route Handlers that need backend data receive it in the request body from the client rather than fetching it themselves.

### Route Structure

All authenticated routes live under `src/app/(main)/` (a route group). The middleware file is **`src/proxy.ts`** (not `middleware.ts`) — this is intentional for Next.js 16. It:
1. Redirects unauthenticated users and those without an `erp_workspace_id` cookie to `/select-branch`
2. Enforces module-level permission checks against codes stored in the NextAuth JWT. Users with `role === "admin"` bypass all checks.
3. Wraps `withAuth` in a plain function so `/auth/login` can redirect already-authenticated users (`withAuth` early-bypasses the signIn page, so that redirect cannot live inside it). The login page stays static/prerendered as a result — don't reintroduce a blocking `getServerSession` there.

Routes are grouped by business domain rather than kept flat: `system/`, `sales/`, `operations/`, `wms/`, `procurement/`, `manufacturing/`, `finance/`, `hr/`, `other/`, plus `config/` and `settings/`. Each group maps to a permission code (`R-CORE`, `R-CRM`, `R-MESACONTROL`, `R-WMS`, `R-COMPRAS`, `R-PRODUCCION`, `R-CONTABILIDAD`, `R-RH`, `R-OTROS-MODULOS`, `R-CONFIGURACION`). Group/sub-route definitions, sidebar labels, and module icons are centralized in `src/constants/appRoutes.ts`; the route-prefix → permission map and post-login redirect priority live in `src/constants/routePermissions.ts`. Adding a top-level module means touching `appRoutes.ts`, `routePermissions.ts`, **and** the `matcher` array in `src/proxy.ts`. The sidebar (`getSidebarSectionsByPath`) is context-aware — it lists the top-level modules on `/` and `/config`, and the active module's sub-routes when inside one.

### Feature Module Structure

`src/features/` holds 55+ modules. Each follows:

```
src/features/<module>/
├── components/    # UI for this module (+ ...Columns.tsx for table column defs)
├── hooks/         # TanStack Query hooks (useQuery/useMutation) + form hooks
├── interfaces/    # TypeScript types
├── schemas/       # Zod validation schemas
├── services/      # actions.ts — async functions calling v1_api
├── constants/     # status maps, wizard step definitions (when needed)
├── utils/         # pure helpers (when needed)
├── mocks/         # faker fixtures — see "Mock-only modules" below
└── stores/        # Zustand stores (only when needed)
```

`services/actions.ts` files are thin async wrappers over `v1_api`: each calls a trailing-slash REST endpoint and returns `response.data` directly (no error handling — that's the hook's job). Backend endpoints are **Spanish-named** (e.g. `/inventarios/almacenes/`, `/compras/ordenes/`). The domain language throughout the codebase — API paths, many interface fields, code comments — is Spanish; match it when adding code.

Files named `*.server.ts` inside a feature's `services/` are server-only modules consumed by Route Handlers or Server Components (e.g. `quotes/services/email/quoteEmailContent.server.ts`, `quotes/services/quoteEditAccess.server.ts`). Never import them from client components.

**Multi-step wizards** are the recurring shape for creation flows: a `...StepManager` drives numbered `...Step1`/`...Step2` components inside a `MainDialog` with a `StepProgressBar`, then POSTs to an `/<resource>/onboarding/` endpoint. See `picking/` (most recent, partial-fulfillment flow), `bom/`, `receipts/`, `production-orders/`, and `purchase-orders/` (which has separate onboarding and edit step managers).

#### Mock-only modules

Several feature modules are **UI-only prototypes with no backend**: they have a `mocks/` directory instead of `services/actions.ts` and generate data with `@faker-js/faker`. Currently: `accounting`, `accounts-payable`, `cedicor`, `embroidery`, `expense-purchase-requests`, `pq-orders`, `purchase-order-reviews`, `wms` (the `wms` *feature* is a mock; the real inventory API surfaces through `stock`, `stock-movements`, `stock-transfers`), plus `locations` which mixes a real API with a mocked dashboard.

Mock files call `faker.seed(<fixed number>)` at module scope and pin a literal "today" (`const HOY = new Date("...")`). Both are required: the same fixtures are consumed by a Server Component (stats) and a Client Component (list), so unseeded/relative data would produce hydration mismatches. Keep the seed and the fixed date when editing a mock.

### API Clients (`src/api/`)

Four Axios instances with distinct roles:

| File | Purpose |
|------|---------|
| `v1.api.ts` | Main client with `withCredentials: true` and a 401 refresh interceptor (mutex-queued concurrent retries, `signOut` on refresh failure) |
| `api.ts` | Auth-only client (no interceptors) — strips `/api/v1` from `NEXT_PUBLIC_API_URL` for login/logout/refresh endpoints |
| `facturama.api.ts` | Server-only (`import "server-only"`) — Basic auth from env vars, used only in Route Handlers |
| `ngrok.api.ts` | Server-only (`import "server-only"`) — image file server behind an ngrok tunnel. Its `NGROK_API_TOKEN` is a write-capable shared secret and must never become `NEXT_PUBLIC_`; browsers reach it only through `/api/embroidery-images/*`. `NEXT_PUBLIC_NGROK_BASE_URL` stays public on purpose (hostname for rendering stored image URLs) |

Always use `v1_api` for normal feature API calls. Never import `facturama.api.ts` or `ngrok.api.ts` in client components.

### Route Handlers (`src/app/api/`)

Only seven exist, and none of them proxy ordinary CRUD — that goes browser → backend directly. They exist for work that *requires* a server: rendering (react-email/react-pdf), or holding a secret.

- `auth/[...nextauth]` — NextAuth
- `facturama/customers/status` — Facturama proxy (server-only credentials)
- `embroidery-images` + `embroidery-images/upload` — proxy to the ngrok file server (server-only token)
- `quotes/[quoteId]/send-email`, `invoices/[invoiceId]/send-email`, `purchase-orders/[orderId]/send-email` — render an email template to HTML/text and return it; the client fetched the record itself and passes it in the body

Route Handlers **do not go through `src/proxy.ts`**, so each one authorizes itself with the helpers in `src/lib/routeHandlers.ts`: `requireAuthenticatedSession(permissionCode)` (returns `{ session }` or a ready-to-return 401/403 `errorResponse`) and `parseRequiredJsonField(request, field)` (returns `{ value, body }` or a 400). Follow that shape — check `"errorResponse" in result` and return early — for any new handler.

### Emails and PDFs

- `src/emails/` — react-email templates (`QuoteEmail`, `InvoiceEmail`, `PurchaseOrderEmail`) sharing `shared/BaseEmailLayout.tsx`. Rendered server-side by the `send-email` Route Handlers.
- `src/pdfs/` — `@react-pdf/renderer` documents, one triple per document (`...PdfDocument.tsx` + `...PdfStyles.ts` + `...PdfColors.ts`) extending `shared/BasePdfStyles.ts` / `shared/BasePdfColors.ts`. When adding a PDF, follow the triple and extend the shared bases rather than inlining styles.

### Authentication

NextAuth uses `CredentialsProvider` with JWT strategy. The browser handles the full auth flow (including optional MFA) directly against the backend cookie-based API. The `userData` credential passed to `authorize()` is pre-serialized user data from a completed login — NextAuth does not re-authenticate with the backend itself. The JWT secret is resolved in one place (`src/lib/authSecret.ts`) and passed explicitly to `withAuth`, `getToken`, and `authOptions`; a mismatch there causes an infinite redirect loop.

### State Management

- **Server state**: TanStack Query v5 (`staleTime: 15min`, `retry: 1`, `refetchOnWindowFocus: false`)
  - Query keys are plain arrays, resource name first, params appended: `["warehouses"]`, `["branches", companyId]`, `["accounts-receivable", params ?? {}]`.
  - Delete/edit catalog mutations use **optimistic updates**: `onMutate` cancels in-flight queries, snapshots the cache, and writes the optimistic value; `onError` rolls back from the snapshot; `onSettled` invalidates. See any `useDelete*` hook (e.g. `useDeleteWarehouse`).
  - Mutations report to the user with `react-hot-toast` (`toast.success` in `onSuccess`, `toast.error` in `onError`) — used in ~100 feature files, so match it.
  - Error copy comes from `extractErrorMessage(error, fallback)` (reads the backend's `{ error: string }`) and `firstDrfMessage(value)` (unwraps DRF field errors that arrive as `string | string[]`). Don't hand-roll these again.
- **Global client state**: Zustand v5 with `devtools` + `persist` middleware
  - `useThemeStore` (`src/stores/theme.store.ts`) — light/dark/system theme, persisted in localStorage
  - `useWorkspaceStore` (`src/features/workspace/store/workspace.store.ts`) — selected branch/company, persisted. `branchSwitching` flag auto-resets after 1800ms and drives `BranchChangeLoader`

### Forms

Forms use **TanStack Form** (`@tanstack/react-form`) with **Zod** schemas (each feature's `schemas/`) for validation. Build them with the shared primitives (`FormInput`, `FormSelect`, `FormTextarea`, `FormToggle`, `FormButtons`) rather than raw inputs.

### Key Shared Components (`src/components/`)

- **`DataTable.tsx`** — Full TanStack Table wrapper with sorting, pagination (10/20/50/100), global search, column visibility, drag-to-reorder columns, column resize, filter chips, and a refresh button. The `eslint-disable react-hooks/incompatible-library` comment is intentional. Notable props:
  - `actionButton` renders in the toolbar (which always stays mounted). Pass `isLoading` / `isError` / `errorTitle` / `errorMessage` / `onErrorRetry` and let the table render its own body states instead of swapping the whole table for a skeleton or `ErrorState`.
  - `filterConfig` and the search box filter the `data` array **in memory** — they do not send params to the server. A view that needs server-side filtering must fetch and pass the filtered data itself.
  - `serverPagination` switches the pager to caller-controlled pages (the table stops slicing `data`); `paginationResetKey` resets to page 1 without clobbering sort/search/columns; `getRowId` ties per-row state to the datum instead of its index.
- **`MainDialog.tsx` / `ConfirmDialog.tsx`** — Radix Dialog wrappers; use these for all modals
- **`FormInput.tsx`** and matching form primitives (`FormSelect`, `FormTextarea`, `FormToggle`, `FormButtons`) — always prefer these over raw `<input>` elements
- **`StepProgressBar.tsx`** — Step indicator for multi-step wizard dialogs; paired with a feature-level `...StepManager` inside a `MainDialog`
- **`Icons.tsx`** — Central SVG icon registry

### Dark Mode

The root `layout.tsx` inlines a synchronous script via `dangerouslySetInnerHTML` to read the theme from localStorage and apply the `dark` class before first paint, preventing FOUC.

## Environment Variables

```
NEXTAUTH_URL=
NEXTAUTH_SECRET=
NEXT_PUBLIC_API_URL=          # e.g. https://nucleo-erp.vercel.app/api/v1

# Server-only (Facturama Route Handler)
FACTURAMA_URL=
FACTURAMA_USER=
FACTURAMA_PASSWORD=

# External image file server (quotes embroidery gallery)
NEXT_PUBLIC_NGROK_BASE_URL=   # public hostname, used to render image URLs
NGROK_API_TOKEN=              # server-only write-capable secret — never NEXT_PUBLIC_
```

## Path Alias

`@/*` resolves from the **repo root** (not `src/`). Import as `@/src/features/...`, `@/src/components/...`, etc.

## Tailwind

Using Tailwind v4 via PostCSS plugin only — there is no `tailwind.config.*` file. Configuration lives in `postcss.config.mjs`.

## React Compiler

The **React Compiler is enabled** (`reactCompiler: true` in `next.config.ts`, via `babel-plugin-react-compiler`). Components are auto-memoized at build time, so manual `useMemo`/`useCallback`/`React.memo` are generally unnecessary — don't add them reflexively. This is also why `DataTable.tsx` carries the intentional `eslint-disable react-hooks/incompatible-library` comment. `next.config.ts` also strips `console.*` in production builds (`compiler.removeConsole`) and whitelists remote image hosts (`raw.githubusercontent.com`, `dl.dropboxusercontent.com`) — new remote image sources must be added to `images.remotePatterns`.
