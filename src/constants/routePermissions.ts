/**
 * Mapa de ruta → permiso requerido, evaluado por `src/proxy.ts`.
 *
 * ORDEN SIGNIFICATIVO. El proxy resuelve la regla con `find()`, que devuelve la
 * PRIMERA coincidencia, y compara con `pathname === prefix ||
 * pathname.startsWith(`${prefix}/`)`. De ahí dos consecuencias:
 *
 *   1. Las reglas de SECCIÓN deben ir ANTES que la regla de MÓDULO. Si
 *      "/procurement" apareciera primero, ninguna de sus secciones se
 *      evaluaría nunca.
 *   2. Las rutas de detalle heredan la regla de su sección por el `startsWith`:
 *      `/procurement/purchase-orders/12` cae en "/procurement/purchase-orders"
 *      y exige `R-COMPRAS-OC`, no `R-COMPRAS`.
 *
 * El permiso de MÓDULO (`R-<MODULO>`) queda como la puerta del dashboard/landing
 * del módulo y NO concede acceso a sus secciones: cada sección exige su propio
 * código. Las rutas de un módulo sin código de sección propio en el catálogo
 * (p. ej. "/wms/locations") caen en la regla de módulo.
 *
 * `permission` acepta un código o un ARREGLO de códigos. Con arreglo la regla se
 * cumple teniendo CUALQUIERA de ellos (`hasAnyPermission`), para rutas neutras
 * alcanzables legítimamente desde varios módulos. Un código suelto se evalúa
 * exactamente igual que antes (`[code]` con `hasAnyPermission` ≡ `hasPermission`).
 */
export const routePermissions: Array<{
  prefix: string;
  permission: string | string[];
}> = [
  { prefix: "/config", permission: "R-CONFIGURACION" },

  // ── Ruta neutra de detalle de pedido ──────────────────────────────────────
  // `/orders/[id]` no cuelga de ningún módulo: se alcanza desde Ventas, Mesa de
  // Control, WMS, Compras y Producción vía `?from=`. Por eso NO exige un código
  // concreto sino CUALQUIERA de los que dan acceso legítimo al pedido o a los
  // documentos que cuelgan de él (las cotizaciones, órdenes y pickings del
  // bloque "Documentos relacionados" se consultan desde aquí con las
  // credenciales reales del usuario y el backend no filtra ese detalle por
  // permiso: esta regla es el único control de acceso).
  // Va arriba, antes que cualquier prefijo de módulo, para que ninguna regla
  // más genérica pueda capturarla si se añaden reglas nuevas.
  {
    prefix: "/orders",
    permission: [
      "R-CRM-PEDIDOS",
      "R-WMS-PEDIDOS",
      "R-COMPRAS-PEDIDOS",
      "R-MESACONTROL-PEDIDOS",
      "R-PRODUCCION-OB",
      "R-PRODUCCION-OR",
      "R-PRODUCCION-CM",
      "R-COMPRAS-OC",
      "R-WMS-PICKING",
    ],
  },

  // ── Panel de Control (Core) ───────────────────────────────────────────────
  { prefix: "/system/reports", permission: "R-CORE-REPORTES" },
  { prefix: "/system", permission: "R-CORE" },

  // ── CRM y Ventas ──────────────────────────────────────────────────────────
  { prefix: "/sales/customers", permission: "R-CRM-CLIENTES" },
  // El ALTA exige su propio código, no el de lectura de la sección: sin esta
  // regla —que DEBE ir antes de "/sales/quotes"— la pantalla sería alcanzable
  // escribiendo la URL por quien solo puede consultar cotizaciones, pese a que
  // el botón "+ Nueva cotización" ya se oculta con el mismo permiso
  // (`QuoteList`/`QuoteKanbanBoard`).
  { prefix: "/sales/quotes/new", permission: "C-CRM-COTIZACIONES" },
  // Cubre también /sales/quotes/[id]/edit por el `startsWith`: al llevar un
  // segmento dinámico en medio no puede expresarse como prefijo, así que la
  // edición se controla con E-CRM-COTIZACIONES en la acción "Editar".
  { prefix: "/sales/quotes", permission: "R-CRM-COTIZACIONES" },
  { prefix: "/sales/orders", permission: "R-CRM-PEDIDOS" },
  { prefix: "/sales/emails", permission: "R-CRM-CORREOS" },
  { prefix: "/sales/calendar", permission: "R-CRM-CALENDAR" },
  { prefix: "/sales", permission: "R-CRM" },

  // ── Mesa de Control ───────────────────────────────────────────────────────
  { prefix: "/operations/quotes", permission: "R-MESACONTROL-COTI" },
  { prefix: "/operations/orders", permission: "R-MESACONTROL-PEDIDOS" },
  { prefix: "/operations/customers", permission: "R-MESACONTROL-CLIENTES" },
  { prefix: "/operations", permission: "R-MESACONTROL" },

  // ── Operaciones de Almacén (WMS) ──────────────────────────────────────────
  { prefix: "/wms/orders", permission: "R-WMS-PEDIDOS" },
  { prefix: "/wms/stock", permission: "R-WMS-EXISTENCIAS" },
  { prefix: "/wms/receipts", permission: "R-WMS-RECEPCIONES" },
  { prefix: "/wms/picking", permission: "R-WMS-PICKING" },
  { prefix: "/wms/packing", permission: "R-WMS-PACKING" },
  { prefix: "/wms/shipping", permission: "R-WMS-ENVIO" },
  { prefix: "/wms/rfid-labels", permission: "R-WMS-ETIQUETAS" },
  { prefix: "/wms/rfid-scanner", permission: "R-WMS-SCANNER" },
  { prefix: "/wms", permission: "R-WMS" },

  // ── Compras y SCM ─────────────────────────────────────────────────────────
  { prefix: "/procurement/orders", permission: "R-COMPRAS-PEDIDOS" },
  { prefix: "/procurement/purchase-orders", permission: "R-COMPRAS-OC" },
  { prefix: "/procurement/purchase-order-receipts", permission: "R-COMPRAS-RECEP" },
  { prefix: "/procurement/suppliers", permission: "R-COMPRAS-PROV" },
  { prefix: "/procurement", permission: "R-COMPRAS" },

  // ── Manufactura (Producción) ──────────────────────────────────────────────
  { prefix: "/manufacturing/production-orders", permission: "R-PRODUCCION-OP" },
  { prefix: "/manufacturing/embroidery", permission: "R-PRODUCCION-OB" },
  { prefix: "/manufacturing/reflective-orders", permission: "R-PRODUCCION-OR" },
  { prefix: "/manufacturing/corte-manga", permission: "R-PRODUCCION-CM" },
  { prefix: "/manufacturing", permission: "R-PRODUCCION" },

  // ── Finanzas y Contabilidad ───────────────────────────────────────────────
  { prefix: "/finance/invoicing", permission: "R-CONTABILIDAD-FACTURACION" },
  { prefix: "/finance/accounts-receivable", permission: "R-CONTABILIDAD-CXC" },
  { prefix: "/finance/accounting-customers", permission: "R-CONTABILIDAD-CLIENTES" },
  { prefix: "/finance", permission: "R-CONTABILIDAD" },

  // ── Módulos sin secciones en el catálogo ──────────────────────────────────
  { prefix: "/hr", permission: "R-RH" },
];

/**
 * Mapa de redirección post-login ordenado por prioridad.
 *
 * Cuando un usuario inicia sesión, se evalúa este arreglo en orden:
 * el primer permiso que posea el usuario determina su ruta de redirección.
 *
 * Prioridad actual (de mayor a menor):
 *   1. R-CRM        → /sales       (CRM / Ventas)
 *   2. R-MESACONTROL → /operations  (Mesa de Control)
 *   3. R-WMS         → /wms         (WMS / Almacenes)
 *
 * Usa permisos de MÓDULO a propósito: destino es el landing de cada módulo, que
 * es justo lo que `R-<MODULO>` sigue autorizando.
 *
 * Si el usuario no tiene ninguno de estos permisos, se redirige a "/".
 * Los usuarios con rol "admin" siempre van a "/" independientemente de sus permisos.
 */
export const loginRedirects: Array<{ permission: string; path: string }> = [
  { permission: "R-CRM", path: "/sales" },
  { permission: "R-MESACONTROL", path: "/operations" },
  { permission: "R-WMS", path: "/wms" },
];
