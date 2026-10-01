import { CorteMangaOrderPageContent } from "@/src/features/corte-manga/components/CorteMangaOrderPageContent";

/**
 * Detalle de una orden de corte de manga —
 * `GET /produccion/orden-corte-manga/{id}/`.
 *
 * Cuelga del módulo (`/manufacturing/corte-manga/[id]`) y NO de una ruta neutra
 * como `/orders/[id]`: una OCM solo se consulta desde Producción. Por el
 * `startsWith` del proxy cae en la regla `/manufacturing/corte-manga` de
 * `routePermissions.ts` y exige `R-PRODUCCION-CM` (no el `R-PRODUCCION` del
 * módulo); junto con el matcher de `proxy.ts`, no hace falta registrar nada.
 * Tampoco tiene entrada en `appRoutes.ts` (otros detalles sí la tienen, ocultos
 * con `showInSidebar: false`, p. ej. `/sales/customers/[id]`): el sub-grupo y
 * la hoja activos se resuelven por prefijo hacia Órdenes de Corte de Manga.
 *
 * Convive con los DOS diálogos del módulo, que siguen intactos:
 * `CorteMangaOrderDetailDialog` (recibe la fila del listado) y
 * `CorteMangaOrderDetailByIdDialog` (self-fetching, para "Documentos
 * relacionados" del detalle de pedido). Esta página es la vista extendida, de
 * SOLO LECTURA: `estatus_corte` es `read_only` y el backend no expone transición
 * (`PUT`/`PATCH` → 405).
 */
export default async function CorteMangaOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="w-full space-y-6 pt-2">
      <CorteMangaOrderPageContent orderId={id} />
    </div>
  );
}
