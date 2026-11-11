import { matchesRoutePrefix } from "../utils/matchesRoutePrefix";

/**
 * Rutas que dependen de la empresa de la sesión (EC-842), evaluadas por
 * `CompanyGate` en el layout de (Main).
 *
 * Desde EC-798 el backend acota ventas, finanzas, terceros y compras SOLO por
 * `user.empresa`: sin empresa asignada esas pantallas saldrían vacías sin
 * explicar por qué. El gate no las monta (ni dispara sus consultas) hasta
 * confirmar la empresa, y si el usuario no tiene muestra el aviso.
 *
 * ORDEN SIGNIFICATIVO, igual que `routePermissions`: se toma la PRIMERA regla
 * cuyo prefijo coincide (`matchesRoutePrefix`),
 * así que las excepciones (`gated: false`) van ANTES que la regla más general
 * que las contiene. Una ruta que no coincide con ninguna regla no se bloquea.
 *
 * Compras conserva su propio aviso en los KPIs (`kpiSinEmpresa`); de su módulo
 * solo pasa por aquí la sección de proveedores (terceros).
 */
export const companyGatedRoutes: ReadonlyArray<{ prefix: string; gated: boolean }> = [
  // ── Ruta neutra de detalle de pedido ──────────────────────────────────────
  // `/orders/[id]` y su edición desde Mesa de Control: sin empresa el backend
  // respondería 404 y la vista diría "no disponible" sin explicar por qué.
  { prefix: "/orders", gated: true },

  // ── Ventas ────────────────────────────────────────────────────────────────
  // Calendario y correos son de la cuenta de Google del usuario, no de la empresa.
  { prefix: "/sales/calendar", gated: false },
  { prefix: "/sales/emails", gated: false },
  { prefix: "/sales", gated: true },

  // ── Finanzas ──────────────────────────────────────────────────────────────
  { prefix: "/finance", gated: true },

  // ── Terceros: proveedores ─────────────────────────────────────────────────
  { prefix: "/procurement/suppliers", gated: true },

  // ── Mesa de Control ───────────────────────────────────────────────────────
  // Solo sus secciones de ventas y terceros, y el pipeline de inventario (no
  // entra en EC-798, pero sin empresa su consulta nunca corre). La portada,
  // calendario, correos y muestras no dependen de la empresa.
  { prefix: "/operations/customers", gated: true },
  { prefix: "/operations/orders", gated: true },
  { prefix: "/operations/scheduled-orders", gated: true },
  { prefix: "/operations/quotes", gated: true },
  { prefix: "/operations/dashboard", gated: true },
  { prefix: "/operations/inventory-pipeline", gated: true },

  // ── Panel de Control ──────────────────────────────────────────────────────
  // La bitácora de documentos es de la empresa activa: sin empresa el backend
  // devuelve la lista vacía, que se leería como "no hay eventos". Los reportes
  // de inventario y la portada no pasan por aquí.
  { prefix: "/system/document-audit", gated: true },
];

/** `true` si la ruta depende de la empresa de la sesión. */
export const isCompanyGatedPath = (pathname: string): boolean =>
  companyGatedRoutes.find((rule) => matchesRoutePrefix(pathname, rule.prefix))?.gated ?? false;
