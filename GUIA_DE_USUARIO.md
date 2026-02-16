## Guía de Usuario – ERP NextJS

Esta guía explica, a nivel funcional, cómo utilizar la aplicación ERP construida sobre Next.js. Está pensada para usuarios finales (no técnicos) que ya tienen acceso al sistema.

---

## 1. Acceso al sistema

- **URL de acceso**: proporcionada por el administrador (ej. entorno local `http://localhost:3000` o despliegue en producción).
- **Requisitos**:
  - Navegador moderno (Chrome, Edge, Firefox, Safari).
  - Usuario y contraseña válidos, creados previamente por el administrador o durante el flujo de registro.

### 1.1 Inicio de sesión

1. Accede a la ruta `/auth/login`.
2. Ingresa tu **correo electrónico** y **contraseña**.
3. Haz clic en **“Iniciar sesión”**.
4. Si las credenciales son correctas, serás redirigido a la *Selección de espacio de trabajo*.

Si ya estás autenticado e intentas entrar a `/auth/login`, el sistema te redirige automáticamente al Dashboard.

---

## 2. Selección de empresa y sucursal

Tras el login, el sistema utiliza un **selector de espacio de trabajo** (empresas y sucursales) para que el usuario elija sobre qué contexto trabajar.

- Pantalla principal de selección:
  - **Listado de empresas** (`CompanyGrid`).
  - Para cada empresa se muestra nombre, información básica y número de sucursales.
- Al seleccionar una empresa:
  - Se muestran sus **sucursales** (`BranchGrid` o listados similares).
  - El usuario elige la sucursal activa con la que operará.

La información seleccionada se guarda en el **store de workspace** (`workspace.store.ts`), de modo que:

- El encabezado de la aplicación (`Header` y `WorkspaceInfo`) siempre muestra la empresa y sucursal activa.
- Los módulos (inventarios, facturación, etc.) trabajan con ese contexto.

---

## 3. Navegación principal

Una vez dentro del sistema, la interfaz se organiza en:

- **Sidebar lateral** (`Sidebar`):
  - Navegación entre módulos principales:
    - Dashboard
    - Inventarios
    - Facturación (Invoicing)
    - Cuentas por pagar
    - Cuentas por cobrar
    - Producción
    - Órdenes / Pedidos
    - Recepciones
    - Bancos / Cuentas bancarias
    - Contabilidad
    - Configuración
  - La definición de los ítems se encuentra en `sidebarItems.ts`.
- **Header superior** (`Header`):
  - Buscador rápido (`SearchBar`).
  - Notificaciones (`Notifications`).
  - Información de workspace (`WorkspaceInfo`).
  - Menú de usuario (`UserMenu`) con opciones como cerrar sesión.
- **Contenido principal**:
  - Zona central donde se cargan las páginas del módulo seleccionado.

La navegación entre secciones se realiza con enlaces estándar (`Link` de Next.js) para mantener una experiencia rápida y consistente.

---

## 4. Dashboard

Ruta: `/dashboard`

El Dashboard muestra una visión general del sistema:

- **Acciones rápidas**:
  - Botón **“Nuevo Pedido”** para iniciar rápidamente la captura de un pedido.
  - Si el usuario es administrador (`role === "admin"`), un botón para ir a **Configuración**.
- **Tarjetas de métricas** (`StatsCards`):
  - Resumen de ventas, órdenes, inventario, etc. (datos de ejemplo que pueden conectarse a métricas reales).

Este módulo está pensado como punto de partida diario para ver el estado general del negocio.

---

## 5. Configuración

Ruta: `/config`

La sección de Configuración es el “panel de control” del ERP. Desde aquí se administran los **catálogos base**:

- **Sucursales** (`BranchList`, `BranchForm`, `BranchDetails`).
- **Almacenes** (`WarehouseList`, `WarehouseForm`).
- **Ubicaciones** (`LocationList`, `LocationForm`).
- **Usuarios** (`UserList`, `UserForm`, `UserDetails`).
- **Monedas** (`CurrencyList`, `CurrencyForm`).
- **Información fiscal SAT** (`SatInfo`, `FiscalAddressForm`).

La vista se organiza con tarjetas (`ConfigCard`) y un detalle dinámico (`ConfigDetailView`) que carga el módulo seleccionado, utilizando **carga dinámica** para mejorar el rendimiento.

### 5.1 Operaciones típicas en catálogos

En la mayoría de los catálogos se repite el mismo patrón:

- **Listado** (Tablas):
  - Se usan componentes tipo `...List` y columnas definidas en archivos `...Columns.tsx` basados en **TanStack Table**.
  - Permiten ver registros, estados, etiquetas y acciones.
- **Altas / Edición**:
  - Formularios basados en `react-hook-form` + `zod` (validaciones).
  - Inputs reutilizables (`FormInput`, `FormSelect`, `FormButtons`).
  - Validaciones en tiempo real y mensajes de error claros.
- **Detalles**:
  - Componentes `...Details` muestran la información extendida de un registro.

Los catálogos se comunican con la API backend mediante hooks como `useCompanies`, `useBranches`, etc., que internamente llaman a servicios en `services/actions.ts`.

---

## 6. Módulos operativos

Aunque algunos módulos aún manejan datos de ejemplo (dummy data), la estructura está preparada para conectarse a la API:

- **Inventarios** (`/inventories`):
  - Listado de productos (`InventoryList`, `InventoryColumns`, `InventoryStats`).
  - Enfoque en existencias, rotación y estado del inventario.
- **Facturación** (`/invoicing`):
  - Listado de facturas (`InvoiceList`, `InvoiceColumns`, `InvoiceStats`).
  - Columnas para folio, cliente, fecha, estatus, importe, etc.
- **Cuentas por Cobrar** (`/accounts-receivable`):
  - Enfoque en facturas abiertas, vencidas y cobradas.
- **Cuentas por Pagar** (`/accounts-payable`).
- **Producción** (`/production`).
- **Pedidos / Órdenes** (`/orders`).
- **Recepciones** (`/receipts`).
- **Cuentas Bancarias** (`/bank-accounts`).
- **Contabilidad** (`/accounting`).

Cada módulo sigue el patrón:

1. Componente principal de lista (`...List`).
2. Definición de columnas (`...Columns.tsx`).
3. Componente de estadísticas (`...Stats.tsx`) donde aplica.

---

## 7. Manejo de sesiones y cierre de sesión

El sistema utiliza **NextAuth** con estrategia de **JWT**:

- Al iniciar sesión exitosamente, se almacena un token JWT asociado al usuario.
- Dicho token se inyecta automáticamente en cada llamada HTTP a la API `v1_api`.

Para cerrar sesión:

- Utiliza la opción de **Cerrar sesión** en el menú de usuario (`UserMenu`).
- En caso de que el token expire o la API responda con **401**, el sistema cierra sesión y redirige a `/auth/login`.

---

## 8. Notificaciones y diálogos

- **Notificaciones**: se apoyan en `react-hot-toast` para mostrar mensajes breves (éxito, error, información).
- **Diálogos**:
  - Se utilizan componentes basados en **Radix UI** (`MainDialog`, `ConfirmDialog`, `DialogHeader`).
  - Se usan para confirmaciones (ej. eliminar registro) y formularios en modal.

---

## 9. Mejores prácticas de uso

- Completa primero la sección de **Configuración**:
  - Registra tu empresa y sucursales.
  - Configura monedas y usuarios.
  - Define tus almacenes y ubicaciones.
- Después utiliza:
  - **Inventarios** para controlar existencias.
  - **Facturación** y **Cuentas por Cobrar/Pagar** para el flujo financiero.
  - **Producción** y **Órdenes** para el flujo operativo.
- Mantén tus datos fiscales SAT actualizados para emitir documentos correctamente.

---

## 10. Soporte

Para cualquier duda funcional:

- Revisa primero esta guía y las descripciones dentro de cada módulo.
- Si el problema está relacionado con acceso o permisos, consulta con el **administrador del sistema**.

