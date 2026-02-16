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
  - **Zustand** para stores de UI/estado de dominio (ej. `warehouse.store.ts`, `workspace.store.ts`).
- **Formularios y validación**:
  - `react-hook-form` para el manejo de formularios.
  - `zod` para validación declarativa de esquemas.
  - `@hookform/resolvers` para integrar `zod` con `react-hook-form`.
- **Autenticación**:
  - `next-auth` (Credentials Provider, estrategia JWT).
- **HTTP Client**:
  - `axios` configurado en `src/api/v1.api.ts`.

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
  - Constantes compartidas (ej. `sidebarItems.ts` para navegación principal).
- `src/lib/`
  - Utilidades y configuración de infraestructura:
    - `auth.ts` – configuración de NextAuth (providers, callbacks, páginas).
    - `getPageTitle.ts` – utilidades de título de páginas.
- `src/api/`
  - Clientes HTTP configurados:
    - `v1.api.ts` – instancia de axios con baseURL y interceptores.
- `src/types/`
  - Tipos globales, ej. `next-auth.d.ts` para extender el tipo `Session`/`User`.
- `src/proxy.ts`
  - Proxy de Next.js usado para resolver CORS y enrutar requests desde el cliente hacia la API backend (bajo un prefijo `/api/...`).

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
- Este layout aplica a páginas como:
  - `/dashboard`
  - `/inventories`
  - `/invoicing`
  - `/accounts-payable`
  - `/accounts-receivable`
  - `/production`
  - `/orders`
  - `/receipts`
  - `/bank-accounts`
  - `/accounting`
  - `/config`

### 3.3 Layout de autenticación (`src/app/auth/layout.tsx`)

- Layout específico para las páginas:
  - `/auth/login`
- Suele mostrar un fondo centrado, con el formulario dentro de una tarjeta (`card`) visualmente destacada.

### 3.4 Layout de selección de sucursal (`src/app/select-branch/layout.tsx`)

- Layout para la ruta `/select-branch`:
  - Orientado a presentar las empresas y sucursales disponibles, usando componentes como `WorkspaceSelector`, `CompanyGrid` y `BranchGrid`.

---

## 4. Capa de autenticación

### 4.1 Configuración de NextAuth (`src/lib/auth.ts`)

- Se utiliza `CredentialsProvider`:
  - En el método `authorize` se llama al servicio `login` en `features/auth/services/actions.ts`.
  - Si la respuesta incluye `token`, se construye el objeto `user` con:
    - `id`, `name`, `email`.
    - `role`: `"admin"` o `"user"` según `is_admin_empresa`.
    - `token`: JWT devuelto por el backend.
- Callbacks:
  - **jwt**:
    - Copia `role` y `token` al `token` de NextAuth (`token.role`, `token.accessToken`).
  - **session**:
    - Inyecta `role` y `accessToken` en `session.user`.
- Páginas personalizadas:
  - `signIn: "/auth/login"`.
- Estrategia de sesión:
  - `strategy: "jwt"`.

### 4.2 Protección de rutas

- Las páginas del grupo `(main)` y otras rutas protegidas obtienen la sesión con:
  - `getServerSession(authOptions)` en Server Components.
- Si la sesión no existe o no es válida, el flujo de protección se configura a nivel de middleware/proxy (`src/proxy.ts`) o a nivel de página (redirecciones a `/auth/login`).

---

## 5. Capa de datos y API

### 5.1 Cliente HTTP (`src/api/v1.api.ts`)

- Instancia de `axios`:
  - `baseURL: process.env.NEXT_PUBLIC_API_URL`.
  - `headers: { "Content-Type": "application/json" }`.
- Interceptor de **request**:
  - Omite inyección de token en endpoints `/login/`.
  - Obtiene la sesión actual con `getSession()` (NextAuth en cliente).
  - Si existe `session.user.accessToken`, añade `Authorization: Bearer <token>`.
- Interceptor de **response**:
  - Si el backend responde **401**:
    - En el cliente (`typeof window !== "undefined"`), ejecuta `signOut({ callbackUrl: "/auth/login" })`.

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
  - `FormInput`, `FormSelect`, `FormButtons`: inputs y botones reutilizables alineados con el diseño.
- **Diálogos**:
  - `MainDialog`, `ConfirmDialog`, `DialogHeader`: construidos con **Radix UI Dialog**.
  - Se usan para formularios modales, confirmaciones y mensajes de error detallados.
- **Otros**:
  - `HomeGrid` (panel de módulos desde el home/dashboard).
  - `Loader`, `LoadingSkeleton`.
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
- **next.config.ts**:
  - `reactCompiler: true` y configuración del compilador de React para optimizaciones.
  - Configuración de dominios permitidos para imágenes (`images.unsplash.com`, `raw.githubusercontent.com`).
- **proxy.ts**:
  - Archivo específico del proyecto para manejar proxys en Next.js 16, evitando renombrarlo a `middleware.ts`.

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

