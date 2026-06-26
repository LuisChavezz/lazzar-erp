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

Tras el login, el sistema utiliza un **selector de espacio de trabajo** (empresas y sucursales) para que el usuario elija el contexto de operación.

- Pantalla de selección:
  - **Listado de empresas** disponibles.
  - Al seleccionar una empresa, se muestran sus **sucursales**.
- El usuario puede:
  - Elegir una sucursal activa.
  - Continuar sin seleccionar sucursal si no aplica.

La selección se guarda en el **store de workspace** y en una cookie (`erp_workspace_id`), de modo que:

- El encabezado (`WorkspaceInfo`) muestra la empresa y sucursal activa.
- El sistema recuerda el contexto al navegar.
- Se puede cambiar de sucursal desde el header cuando hay más de una disponible.

---

## 3. Navegación principal

Una vez dentro del sistema, la interfaz se organiza en:

- **Sidebar lateral** (`Sidebar`): la navegación está organizada por **módulos de negocio** y es **contextual** (cambia según dónde te encuentres):
  - En **Inicio** y **Configuración** se muestran los módulos principales: **Panel de Control (Core)**, **CRM y Ventas**, **Mesa de Control**, **Operaciones de Almacén**, **Compras y SCM**, **Manufactura (Producción)**, **Finanzas y Contabilidad** y **Capital Humano**.
  - Al entrar a un módulo, el menú muestra sus secciones internas. Por ejemplo, en **Operaciones de Almacén** verás Existencias, Recepciones y Ubicaciones.
  - En la parte inferior, un bloque **Ajustes** agrupa el perfil/seguridad de la cuenta y la **Configuración** del sistema.
  - Cada módulo y sección se muestra según los **permisos** del usuario.
- **Header superior** (`Header`):
  - Buscador rápido (`SearchBar`).
  - Notificaciones (`Notifications`).
  - Información de workspace (`WorkspaceInfo`).
  - Menú de usuario (`UserMenu`).
- **Contenido principal**:
  - Zona central donde se cargan las páginas del módulo seleccionado.

La navegación entre secciones se realiza con enlaces estándar (`Link` de Next.js) para mantener una experiencia rápida y consistente.

---

## 4. Dashboard

Ruta: `/`

El Dashboard muestra una visión general del sistema:

- **Acciones rápidas**:
  - Botón **“Nuevo Pedido”** para iniciar rápidamente la captura de un pedido.
  - Botón de **Configuración** si el usuario tiene permiso.
- **Tarjetas de métricas** (`StatsCards`):
  - Resumen de ventas, órdenes, inventario, etc. (datos de ejemplo que pueden conectarse a métricas reales).

Este módulo está pensado como punto de partida diario para ver el estado general del negocio.

---

## 5. Configuración

Ruta: `/config`

La sección de Configuración es el “panel de control” del ERP. Desde aquí se administran los **catálogos base** organizados por grupos:

- **Organización**: Sucursales, Almacenes, Ubicaciones, Movimientos de Inventario, Proveedores.
- **Usuarios y Accesos**: Usuarios, Roles.
- **Información Fiscal**: Monedas, Series y Folios, Información fiscal, Impuestos.
- **Catálogo de Productos**: Categorías, Tipos, Colores, Tallas, Unidades de Medida.
- **SAT y CFDI**: Claves SAT de productos y servicios, claves SAT de unidades.
- **Productos**: Productos, Variantes de Producto, Materiales.

La vista se organiza con tarjetas (`ConfigCard`) y un detalle dinámico (`ConfigDetailView`) que carga el módulo seleccionado. El acceso a estas tarjetas es administrativo.

### 5.1 Operaciones típicas en catálogos

En la mayoría de los catálogos se repite el mismo patrón:

- **Listado** (Tablas):
  - Se usan componentes tipo `...List` y columnas definidas en archivos `...Columns.tsx` basados en **TanStack Table**.
  - Permiten ver registros, estados, etiquetas y acciones.
- **Altas / Edición**:
  - Formularios basados en `@tanstack/react-form` + `zod` (validaciones).
  - Inputs reutilizables (`FormInput`, `FormSelect`, `FormButtons`).
  - Validaciones en tiempo real y mensajes de error claros.
- **Detalles**:
  - Componentes `...Details` muestran la información extendida de un registro.

Los catálogos se comunican con la API backend mediante hooks como `useCompanies`, `useBranches`, etc., que internamente llaman a servicios en `services/actions.ts`.

### 5.2 Materiales (Lista de Materiales / BOM)

La tarjeta **Materiales** (grupo *Productos*) administra las **listas de materiales** (BOM) de las variantes de producto: qué componentes —y en qué cantidad— se necesitan para fabricar cada variante.

Para crear una lista de materiales:

1. Abre el listado de **Materiales** y ubica la **variante de producto** correspondiente. La lista también puede abrirse desde el detalle de una variante de producto, con el botón **“Lista de Materiales”**.
2. Se abre un **asistente de 2 pasos**:
   - **Paso 1 – Seleccionar Materiales**: marca, mediante selección múltiple, los componentes (productos) que formarán parte de la lista.
   - **Paso 2 – Configurar Materiales**: para cada componente elegido, captura **cantidad**, **unidad de medida**, **desperdicio** (merma), si es **obligatorio** y **observaciones**.
3. Confirma para **guardar** la lista. Los componentes aparecerán en la tabla de materiales de la variante.

Desde el listado de materiales puedes **eliminar** un componente cuando ya no aplique.

---

## 6. Módulos operativos

Los módulos operativos, comerciales y financieros se organizan por **dominio de negocio**:

- **CRM y Ventas** (`/sales`): Clientes (`/sales/customers`), Cotizaciones (`/sales/quotes`, con alta en `/sales/quotes/new` y edición en `/sales/quotes/[id]/edit`), Correos (`/sales/emails`) y Calendario (`/sales/calendar`).
- **Mesa de Control** (`/operations`): Cotizaciones (`/operations/quotes`), Pedidos (`/operations/orders`) y Muestras (`/operations/samples`).
- **Operaciones de Almacén – WMS** (`/wms`): Existencias (`/wms/stock`), Recepciones (`/wms/receipts`) y Ubicaciones (`/wms/locations`). Los Movimientos de Inventario se administran desde **Configuración → Organización**.
- **Compras y SCM** (`/procurement`): Órdenes de Compra (`/procurement/purchase-orders`), Proveedores (`/procurement/suppliers`), Revisión de Pedidos (`/procurement/order-reviews`), Solicitudes de Gastos (`/procurement/expense-requests`) y Pedidos P.Q. (`/procurement/pq-orders`).
- **Manufactura (Producción)** (`/manufacturing`): Órdenes de Producción (`/manufacturing/production-orders`), Órdenes de Bordado (`/manufacturing/embroidery`) y los flujos Cedicor de Nuevo Desarrollo y Producción.
- **Finanzas y Contabilidad** (`/finance`): Facturación (`/finance/invoicing`), CxP (`/finance/accounts-payable`), CxC (`/finance/accounts-receivable`), Bancos (`/finance/bank-accounts`), Contabilidad (`/finance/accounting`) y Lista de Precios (`/finance/price-lists`).
- **Panel de Control (Core)** (`/system`): Reportes (`/system/reports`).
- **Capital Humano** (`/hr`).

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
- El sistema limpia el workspace y su cookie.
- En caso de que el token expire o la API responda con **401**, se cierra sesión y se redirige a `/auth/login`.

---

## 8. Notificaciones y diálogos

- **Notificaciones**: se apoyan en `react-hot-toast` para mostrar mensajes breves (éxito, error, información).
- **Diálogos**:
  - Se utilizan componentes basados en **Radix UI** (`MainDialog`, `ConfirmDialog`, `DialogHeader`).
  - Se usan para confirmaciones (ej. eliminar registro) y formularios en modal.

---

## 9. Mejores prácticas de uso

- Completa primero la sección de **Configuración**:
  - Registra sucursales, almacenes y ubicaciones.
  - Configura usuarios, monedas e información fiscal.
  - Define catálogos de productos, colores, tallas y unidades.
- Después utiliza:
  - **Pedidos** para la captura operativa.
  - **Inventarios** para control de existencias.
  - **Facturación** y **CxC/CxP** para el flujo financiero.
  - **Producción** y **Recepciones** para el flujo operativo.
- Mantén tus datos fiscales y claves SAT actualizados para emitir documentos correctamente.

---

## 10. Soporte

Para cualquier duda funcional:

- Revisa primero esta guía y las descripciones dentro de cada módulo.
- Si el problema está relacionado con acceso o permisos, consulta con el **administrador del sistema**.
