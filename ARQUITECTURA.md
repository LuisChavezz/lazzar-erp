## Arquitectura del Proyecto – ERP NextJS

Este documento describe la arquitectura técnica del proyecto **erp-nextjs-v1**, un ERP moderno construido con **Next.js 16** y orientado a un backend REST externo.

---

## 1. Stack tecnológico

- **Framework web**: [Next.js 16](https://nextjs.org/) (App Router).
- **Lenguaje**: TypeScript estricto (`strict: true` en `tsconfig.json`).
- **Frontend**:
  - React 19.
  - Radix UI Themes (`@radix-ui/themes`) para componentes base (Dialog, Button, etc.).
  - TailwindCSS 4 (clases utilitarias en los componentes, configuración vía `@tailwindcss/postcss`).
- **Estado y datos**:
  - **TanStack Query** (`@tanstack/react-query`) para fetch, cache y sincronización de datos de la API.
  - **React Query Devtools** para inspeccionar el cache en desarrollo.
  - **Zustand** para stores de UI/estado de dominio (ej. `workspace.store.ts`).
- **Tablas y UI avanzada**:
  - **TanStack Table** como base de `DataTable`.
  - `react-hot-toast` para notificaciones.
- **Formularios y validación**:
  - `@tanstack/react-form` para el manejo de formularios.
  - `zod` para validación declarativa de esquemas.
  - Validación integrada en hooks y adaptadores de error por campo para UI.
- **Autenticación**:
  - `next-auth` (Credentials Provider, estrategia JWT).
- **HTTP Client**:
  - `axios` configurado en `src/api/` (cuatro instancias, ver §5.1).
- **Librerías especializadas**:
  - **FullCalendar** (`@fullcalendar/*`) para el calendario de ventas.
  - **@react-pdf/renderer** para generación de PDF y **@react-email** para el render de correos (cotizaciones).
  - **@dnd-kit/react** para reordenar columnas en `DataTable`.
  - **@tanstack/react-virtual** para virtualización de listas largas.

---

## 2. Organización de carpetas

Ruta base del proyecto:

- `src/app/`
  - Implementa el **App Router** de Next.js.
  - Contiene layouts, páginas públicas (login) y páginas protegidas (dashboard, módulos).
- `src/features/`
  - Agrupa por **módulo funcional** (ej. `companies`, `branches`, `inventory`, `sat`, etc.).
  - Cada módulo contiene:
    - `components/` – componentes de UI específicos del módulo.
    - `hooks/` – hooks de React Query / lógica de negocio.
    - `interfaces/` o `types/` – tipos e interfaces de dominio.
    - `schemas/` – esquemas de validación `zod`.
    - `services/` – acciones de acceso a datos (llamadas a la API).
    - `stores/` – stores Zustand (cuando aplica).
- `src/components/`
  - Componentes **compartidos** de alto nivel:
    - Layout: `Header`, `Sidebar`, `MobileSidebar`, `HeaderTitle`, `WorkspaceInfo`.
    - UI genérica: `FormInput`, `FormSelect`, `FormButtons`, `MainDialog`, `ConfirmDialog`, `DataTable`, `Loader`, `LoadingSkeleton`, `TiltCard`.
    - Íconos: `Icons.tsx`.
- `src/constants/`
  - Constantes compartidas (ej. `sidebarItems.ts` y `routePermissions.ts`).
- `src/lib/`
  - Configuración de infraestructura:
    - `auth.ts` – configuración de NextAuth (providers, callbacks, páginas).
- `src/utils/`
  - Utilidades comunes:
    - `getPageTitle.ts` – título de páginas según ruta.
    - `permissions.ts` – helper de permisos.
    - `getSidebarItems.ts` – filtrado de navegación por permisos.
- `src/api/`
  - Clientes HTTP configurados (ver §5.1):
    - `v1.api.ts` (principal), `api.ts` (solo-auth), `facturama.api.ts` (solo-servidor) y `ngrok.api.ts` (carga de imágenes).
- `src/types/`
  - Tipos globales, ej. `next-auth.d.ts` para extender `Session`/`User`.
- `src/interfaces/`
  - Tipos de soporte transversal (ej. `permission-context.interface.ts`).
- `src/proxy.ts`
  - Middleware de autenticación y permisos (selección de workspace, control de acceso por ruta).

---

## 3. Flujo de App Router y layouts

### 3.1 Root Layout (`src/app/layout.tsx`)

- Define el layout raíz para todo el proyecto:
  - Carga fuentes **Inter** y **Poppins** mediante `next/font`.
  - Importa estilos globales (`globals.css`) y estilos de Radix (`@radix-ui/themes/styles.css`).
  - Obtiene la sesión actual vía `getServerSession(authOptions)` (Server Component).
  - Envuelve la aplicación en un componente `Provider` que:
    - Integra **NextAuth SessionProvider** en el cliente.
    - Configura **TanStack Query** (QueryClientProvider).
    - Configura **Radix Theme** y otros providers globales.

### 3.2 Layout principal de la aplicación (`src/app/(main)/layout.tsx`)

- Layout utilizado por las rutas dentro del grupo `(main)`:
  - Muestra `Sidebar` fijo a la izquierda.
  - Header superior (`Header`) con buscador, notificaciones, workspace y menú de usuario.
  - Área central de contenido (`main`) con scroll vertical.
- Las rutas se agrupan por **dominio de negocio** (ya no de forma plana). Cada grupo tiene una página raíz y, en su caso, subrutas:
  - `/` – Dashboard / inicio.
  - `/system` – Panel de Control (Core): `/system/reports`.
  - `/sales` – CRM y Ventas: `/sales/customers` (y `/sales/customers/[id]`), `/sales/quotes` (`/new`, `/[id]`, `/[id]/edit`), `/sales/emails`, `/sales/calendar`.
  - `/operations` – Mesa de Control: `/operations/quotes`, `/operations/orders`, `/operations/samples`.
  - `/wms` – Operaciones de Almacén: `/wms/stock`, `/wms/stock-movements`, `/wms/receipts`, `/wms/locations`.
  - `/procurement` – Compras y SCM: `/procurement/purchase-orders`, `/procurement/suppliers`, `/procurement/order-reviews`, `/procurement/expense-requests`, `/procurement/pq-orders`.
  - `/manufacturing` – Manufactura: `/manufacturing/production-orders`, `/manufacturing/embroidery`, `/manufacturing/cedicor-production-orders`, `/manufacturing/cedicor-product-development-orders`.
  - `/finance` – Finanzas y Contabilidad: `/finance/invoicing`, `/finance/accounts-payable`, `/finance/accounts-receivable`, `/finance/bank-accounts`, `/finance/accounting`, `/finance/price-lists`.
  - `/hr` – Capital Humano.
  - `/config` – Configuración (catálogos maestros).
  - `/settings` – Ajustes de cuenta: `/settings/profile`, `/settings/security`.

  La definición de grupos, etiquetas de navegación e iconos vive centralizada en `src/constants/appRoutes.ts`; el mapeo prefijo→permiso y la prioridad de redirección post-login en `src/constants/routePermissions.ts`.

### 3.3 Layout de autenticación (`src/app/auth/layout.tsx`)

- Layout específico para las páginas:
  - `/auth/login`
- Suele mostrar un fondo centrado, con el formulario dentro de una tarjeta (`card`) visualmente destacada.

### 3.4 Página de selección de sucursal (`src/app/select-branch/page.tsx`)

- Página que carga `WorkspaceSelector`:
  - Presenta empresas disponibles y, al seleccionar una, las sucursales asociadas.
  - Al confirmar, guarda el contexto en el store de workspace y redirige al dashboard.

---

## 4. Capa de autenticación

### 4.1 Configuración de NextAuth (`src/lib/auth.ts`)

- Se utiliza `CredentialsProvider` con **autenticación basada en cookies**: el login (incluido el MFA opcional) lo completa el navegador directamente contra el backend, que establece las cookies de sesión. NextAuth **no vuelve a autenticar**.
  - El método `authorize` recibe la credencial `userData` (el usuario ya serializado como JSON tras el login) y únicamente la parsea; no llama a ningún endpoint.
  - Construye el objeto `user` con:
    - `id`, `name` (nombre completo o `username`), `email`.
    - `role`: `"admin"` o `"user"` según `is_admin_empresa || es_admin || is_superuser`.
    - `permissions`: lista de permisos del usuario (`user.permisos`).
- Callbacks:
  - **jwt**:
    - Copia `role`, `permissions` y `sub` (id) al `token` de NextAuth.
  - **session**:
    - Inyecta `id`, `role` y `permissions` en `session.user`.
- Tipos extendidos:
  - `src/types/next-auth.d.ts` agrega `role` y `permissions` a `User`/`Session`.
- Páginas personalizadas:
  - `signIn: "/auth/login"`.
- Estrategia de sesión:
  - `strategy: "jwt"`.

### 4.2 Protección de rutas y permisos

- La autenticación y el control de permisos se ejecutan en `src/proxy.ts` usando `withAuth` de NextAuth.
- `routePermissions.ts` define el permiso mínimo por prefijo de ruta (`/orders`, `/config`, etc.).
- Si no hay permiso, el middleware redirige a `/`.

### 4.3 Workspace y selección de sucursal

- Antes de acceder a rutas protegidas, `proxy.ts` valida la cookie `erp_workspace_id`.
- Si no existe, redirige a `/select-branch` para elegir empresa y sucursal.
- La selección se guarda en `workspace.store.ts` con persistencia local y se refleja en `WorkspaceInfo`.

---

## 5. Capa de datos y API

### 5.1 Clientes HTTP (`src/api/`)

El proyecto usa **autenticación basada en cookies** (`withCredentials: true`); el backend gestiona los `Set-Cookie` (`auth-jwt` / `auth-refresh-jwt`), por lo que el cliente ya **no inyecta** el token en una cabecera `Authorization`. Hay cuatro instancias de `axios` con responsabilidades distintas:

- **`v1.api.ts`** (`v1_api`) – cliente principal para todas las llamadas de los features.
  - `baseURL: process.env.NEXT_PUBLIC_API_URL`, `withCredentials: true`, `proxy: false`.
  - Interceptor de **response** con **refresh token y mutex**: ante un **401** intenta refrescar la sesión (`POST /auth/token/refresh/`) una sola vez; las solicitudes concurrentes que también reciban 401 se **encolan** y se reintentan al completarse el refresh. Si el refresh falla (o el reintento vuelve a dar 401), ejecuta `signOut({ callbackUrl: "/auth/login" })`.
- **`api.ts`** (`api`) – cliente **solo-auth**, sin interceptores. Quita `/api/v1` de `NEXT_PUBLIC_API_URL` (`removeApiVersion`) para los endpoints de login/logout/refresh.
- **`facturama.api.ts`** – cliente **solo-servidor** (`import "server-only"`) con Basic auth desde variables de entorno; se usa únicamente en Route Handlers.
- **`ngrok.api.ts`** (`ngrok_api`) – cliente para el endpoint externo (ngrok) de carga de imágenes; cabeceras fijas (`Authorization: Bearer`, `ngrok-skip-browser-warning`) y variables `NEXT_PUBLIC_NGROK_*`.

### 5.2 Servicios y hooks de datos

Cada módulo de `src/features` implementa un patrón coherente:

- **services/actions.ts**:
  - Funciones asíncronas que llaman a la API con `v1_api` (crear, leer, actualizar, borrar).
  - Absorben detalles de endpoints y estructuras de payload.
- **hooks/** (ej. `useCompanies.ts`, `useBranches.ts`, `useCreateCurrency.ts`):
  - Encapsulan **TanStack Query**:
    - `useQuery` para lecturas.
    - `useMutation` para crear/actualizar/eliminar.
  - Gestionan estados `loading`, `error`, `data`.
  - Pueden disparar `toast` de feedback.
  - Las mutaciones de borrado/edición de catálogos aplican **actualizaciones optimistas**: `onMutate` cancela queries en vuelo y guarda un snapshot del cache antes de escribir el valor optimista; `onError` revierte desde el snapshot y `onSettled` invalida (ver hooks `useDelete*`, p. ej. `useDeleteBomDetalle`).
- **stores/** (Zustand):
  - Usados cuando se requiere estado estable en el cliente (ej. selección de almacén, workspace actual).
  - Se combinan con `persist` y `devtools` para depuración.

---

## 6. Capa de presentación (UI)

### 6.1 Componentes compartidos (`src/components`)

- **Layout/Navegación**:
  - `Header`, `Sidebar`, `MobileSidebar`, `SidebarItem`, `UserMenu`, `WorkspaceInfo`.
- **Tablas y listas**:
  - `DataTable`: componente genérico sobre **TanStack Table**.
  - Columnas definidas en archivos `...Columns.tsx` dentro de cada feature, siguiendo la convención de mantener la tabla en archivos separados.
- **Formularios**:
  - `FormInput`, `FormSelect`, `FormTextarea`, `FormToggle`, `FormButtons`: inputs y botones reutilizables alineados con el diseño (sobre `@tanstack/react-form` + `zod`).
- **Diálogos**:
  - `MainDialog`, `ConfirmDialog`, `DialogHeader`: construidos con **Radix UI Dialog**.
  - Se usan para formularios modales, confirmaciones y mensajes de error detallados.
- **Asistentes (wizards)**:
  - `StepProgressBar`: indicador de pasos para diálogos de alta multi-paso (ver §6.3).
- **Otros**:
  - `HomeGrid` (panel de módulos desde el home).
  - `Loader`, `LoadingSkeleton`, `ErrorState`.
  - `ActionMenu`, `KpiGrid`, `Calendar`, `QuantitySelector`, `ThemeToggle`: utilidades de UI transversales.
  - `Notifications` (integración con `react-hot-toast`).

### 6.2 Componentes por módulo (`src/features/*/components`)

Ejemplos de patrón:

- `CompanyList`, `CompanyForm`, `CompanyDetails` en `features/companies`.
- `BranchList`, `BranchForm`, `BranchDetails` en `features/branches`.
- `CurrencyList`, `CurrencyForm` en `features/currency`.
- `WarehouseList`, `WarehouseForm` en `features/warehouses`.
- `SatInfo`, `FiscalAddressForm`, `FiscalAddressDetails` en `features/sat`.
- `UserList`, `UserForm`, `UserDetails` en `features/users`.

Cada componente se apoya en:

- Hooks de datos (`useCompanies`, `useBranches`, etc.).
- Esquemas de validación (`companies.schema.ts`, `branch.schema.ts`, `currency.schema.ts`, etc.).
- Componentes compartidos (`FormInput`, `FormSelect`, `MainDialog`, `DataTable`).

### 6.3 Asistentes multi-paso (wizards)

Los flujos de alta complejos se modelan como **asistentes dentro de `MainDialog`**: un componente orquestador `...StepManager` mantiene el paso actual y los datos parciales, renderiza el componente de cada paso y muestra el avance con `StepProgressBar`. Ejemplos: `BomStepManager` (lista de materiales: *seleccionar* → *configurar*), `ReceiptStepManager` (recepciones) y `PurchaseOrderOnboardingStepManager` (órdenes de compra).

---

## 7. Manejo de estilos

- **TailwindCSS 4**:
  - Clases utilitarias en todos los componentes para espaciado, tipografía, colores, dark mode, etc.
  - Configuración de Tailwind vía `@tailwindcss/postcss` (`postcss.config.mjs`).
- **globals.css**:
  - Estilos base para body, fuentes y ajustes de autofill.
  - Overrides para componentes Radix (`.rt-DialogOverlay`, `.rt-Button`).
- **Radix Themes**:
  - Permite unificar tipografías, colores y comportamiento de componentes de UI.

---

## 8. Entorno y configuración

- **Variables de entorno** (ver `.env.example`):
  - `NEXTAUTH_URL`: URL pública de la app (ej. `http://localhost:3000` en desarrollo).
  - `NEXTAUTH_SECRET`: secreto para firmar JWT de NextAuth.
  - `NEXT_PUBLIC_API_URL`: base URL de la API v1 (ej. `https://nucleo-erp.vercel.app/api/v1`).
  - `FACTURAMA_URL`, `FACTURAMA_USER`, `FACTURAMA_PASSWORD`: credenciales **solo-servidor** para el Route Handler de Facturama.
  - `NEXT_PUBLIC_NGROK_BASE_URL`, `NEXT_PUBLIC_NGROK_API_TOKEN`: endpoint y token del servicio externo de carga de imágenes.
- **next.config.ts**:
  - `reactCompiler: true` y `removeConsole` en producción.
  - Configuración de dominios permitidos para imágenes (`images.unsplash.com`, `raw.githubusercontent.com`).
- **proxy.ts**:
  - Middleware de NextAuth con matcher para rutas protegidas y validación del workspace.

---

## 9. Patrones y convenciones

- **Feature-first**:
  - La funcionalidad se organiza por módulos de negocio dentro de `src/features`.
- **Separación de responsabilidades**:
  - UI (components) separada de:
    - Esquemas de validación (`schemas`).
    - Tipos de dominio (`interfaces`/`types`).
    - Acceso a datos (`services`).
    - Estado local (`stores` / hooks).
- **Nomenclatura**:
  - Listas: componentes `...List`.
  - Columnas de tablas: `...Columns.tsx`.
  - Stores Zustand: `...store.ts`.
- **Server vs Client Components**:
  - Layouts y páginas que necesitan sesión (pero no interactividad directa) se mantienen como **Server Components** (`async` + `getServerSession`).
  - Componentes interactivos utilizan `"use client";` y se apoyan en hooks (React Query, Zustand, etc.).

---

## 10. Extensibilidad

La arquitectura facilita la extensión del ERP:

- Para agregar un nuevo módulo:
  1. Crear carpeta en `src/features/<nuevo-modulo>` con `components`, `interfaces`, `schemas`, `services`, `hooks`.
  2. Añadir la ruta correspondiente en `src/app/(main)/<nuevo-modulo>/page.tsx`.
  3. Registrar el módulo en `src/constants/sidebarItems.ts` para que aparezca en el `Sidebar`.
- Para añadir nuevos campos a catálogos existentes:
  1. Actualizar las interfaces del dominio.
  2. Ajustar esquemas `zod` y formularios.
  3. Ajustar columnas de las tablas si se deben visualizar.

Con este diseño, el proyecto mantiene una separación clara entre capas y módulos, permitiendo que equipos distintos trabajen de forma relativamente independiente (backend, frontend de cada módulo, diseño de UI) sin perder coherencia general.
