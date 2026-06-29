# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start development server
npm run build      # Production build
npm run lint       # ESLint (flat config, next/core-web-vitals + next/typescript)
npm run typecheck  # tsc --noEmit
```

No test runner exists — there are no test files or testing frameworks in this project.

## Architecture Overview

This is a Next.js 16 App Router ERP frontend. All data lives in an external REST API at `NEXT_PUBLIC_API_URL`; the app is purely a UI client.

### Route Structure

All authenticated routes live under `src/app/(main)/` (a route group). The middleware file is **`src/proxy.ts`** (not `middleware.ts`) — this is intentional for Next.js 16. It:
1. Redirects unauthenticated users and those without an `erp_workspace_id` cookie to `/select-branch`
2. Enforces module-level permission checks against codes stored in the NextAuth JWT (e.g., `R-CRM`, `R-WMS`, `R-COMPRAS`). Users with `role === "admin"` bypass all checks.

Routes are grouped by business domain rather than kept flat: `system/`, `sales/`, `operations/`, `wms/`, `procurement/`, `manufacturing/`, `finance/`, `hr/`, plus `config/` and `settings/`. Each group maps to a permission code (`R-CORE`, `R-CRM`, `R-MESACONTROL`, `R-WMS`, `R-COMPRAS`, `R-PRODUCCION`, `R-CONTABILIDAD`, `R-RH`, `R-CONFIGURACION`). Group/sub-route definitions, sidebar labels, and module icons are centralized in `src/constants/appRoutes.ts`; the route-prefix → permission map and post-login redirect priority live in `src/constants/routePermissions.ts`. The sidebar (`getSidebarSectionsByPath`) is context-aware — it lists the top-level modules on `/` and `/config`, and the active module's sub-routes when inside one.

Only 3 Route Handlers exist (`src/app/api/`): NextAuth, Facturama proxy, and quote email render. All other API calls go directly from the browser to `NEXT_PUBLIC_API_URL`.

### Feature Module Structure

`src/features/` holds 50+ modules. Each follows:

```
src/features/<module>/
├── components/    # UI for this module
├── hooks/         # TanStack Query hooks (useQuery/useMutation)
├── interfaces/    # TypeScript types
├── schemas/       # Zod validation schemas
├── services/      # actions.ts — async functions calling v1_api
└── stores/        # Zustand stores (only when needed)
```

Table column definitions are kept in separate `...Columns.tsx` files within each feature's `components/` directory.

`services/actions.ts` files are thin async wrappers over `v1_api`: each calls a trailing-slash REST endpoint and returns `response.data` directly (no error handling — that's the hook's job). Backend endpoints are **Spanish-named** (e.g. `/inventarios/almacenes/`, `/compras/ordenes/`). The domain language throughout the codebase — API paths, many interface fields, code comments — is Spanish; match it when adding code.

The `bom/` module (bill of materials) is a good template for a multi-step feature: alongside the standard structure it adds a 2-step wizard — `BomStepManager` drives `BomStep1` (select components) → `BomStep2` (configure each), rendered inside a `MainDialog` with a `StepProgressBar`. The same wizard shape recurs in `receipts/`, `purchase-orders/`, and `quotes/` (`...StepManager` + `StepProgressBar`).

### API Clients (`src/api/`)

Four Axios instances with distinct roles:

| File | Purpose |
|------|---------|
| `v1.api.ts` | Main client with `withCredentials: true` and a 401 refresh interceptor (mutex-queued concurrent retries) |
| `api.ts` | Auth-only client (no interceptors) — strips `/api/v1` from `NEXT_PUBLIC_API_URL` for login/logout/refresh endpoints |
| `facturama.api.ts` | Server-only (`import "server-only"`) — Basic auth from env vars, used only in Route Handlers |
| `ngrok.api.ts` | Image-upload client for an external ngrok endpoint — static Bearer token + `ngrok-skip-browser-warning` header (`NEXT_PUBLIC_NGROK_*`). Used by the quotes embroidery image gallery |

Always use `v1_api` for normal feature API calls. Never import `facturama.api.ts` in client components.

### Authentication

NextAuth uses `CredentialsProvider` with JWT strategy. The browser handles the full auth flow (including optional MFA) directly against the backend cookie-based API. The `userData` credential passed to `authorize()` is pre-serialized user data from a completed login — NextAuth does not re-authenticate with the backend itself.

### State Management

- **Server state**: TanStack Query v5 (`staleTime: 15min`, `retry: 1`, `refetchOnWindowFocus: false`)
  - Delete/edit catalog mutations use **optimistic updates**: `onMutate` cancels in-flight queries, snapshots the cache, and writes the optimistic value; `onError` rolls back from the snapshot; `onSettled` invalidates. See any `useDelete*` hook (e.g. `useDeleteBomDetalle`).
- **Global client state**: Zustand v5 with `devtools` + `persist` middleware
  - `useThemeStore` (`src/stores/theme.store.ts`) — light/dark/system theme, persisted in localStorage
  - `useWorkspaceStore` (`src/features/workspace/store/workspace.store.ts`) — selected branch/company, persisted. `branchSwitching` flag auto-resets after 1800ms and drives `BranchChangeLoader`

### Forms

Forms use **TanStack Form** (`@tanstack/react-form`) with **Zod** schemas (each feature's `schemas/`) for validation. Build them with the shared primitives (`FormInput`, `FormSelect`, `FormTextarea`, `FormToggle`, `FormButtons`) rather than raw inputs.

### Key Shared Components (`src/components/`)

- **`DataTable.tsx`** — Full TanStack Table wrapper with sorting, pagination (10/20/50/100), global search, column visibility, drag-to-reorder columns, column resize, filter chips, and a refresh button. The `eslint-disable react-hooks/incompatible-library` comment is intentional.
- **`MainDialog.tsx` / `ConfirmDialog.tsx`** — Radix Dialog wrappers; use these for all modals
- **`FormInput.tsx`** and matching form primitives (`FormSelect`, `FormTextarea`, `FormToggle`, `FormButtons`) — always prefer these over raw `<input>` elements
- **`StepProgressBar.tsx`** — Step indicator for multi-step wizard dialogs; paired with a feature-level `...StepManager` inside a `MainDialog` (see `bom/`, `receipts/`, `purchase-orders/`)
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

# External image-upload endpoint (quotes embroidery gallery)
NEXT_PUBLIC_NGROK_BASE_URL=
NEXT_PUBLIC_NGROK_API_TOKEN=
```

## Path Alias

`@/*` resolves from the **repo root** (not `src/`). Import as `@/src/features/...`, `@/src/components/...`, etc.

## Tailwind

Using Tailwind v4 via PostCSS plugin only — there is no `tailwind.config.*` file. Configuration lives in `postcss.config.mjs`.

## React Compiler

The **React Compiler is enabled** (`reactCompiler: true` in `next.config.ts`, via `babel-plugin-react-compiler`). Components are auto-memoized at build time, so manual `useMemo`/`useCallback`/`React.memo` are generally unnecessary — don't add them reflexively. This is also why `DataTable.tsx` carries the intentional `eslint-disable react-hooks/incompatible-library` comment. `next.config.ts` also strips `console.*` in production builds (`compiler.removeConsole`).
