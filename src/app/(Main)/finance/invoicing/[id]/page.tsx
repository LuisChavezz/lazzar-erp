import { InvoiceDetailPageContent } from "@/src/features/invoicing/components/InvoiceDetailPageContent";
import type { InvoiceDetailQuery } from "@/src/features/invoicing/constants/invoiceDetailOrigins";

/**
 * Detalle de una factura — `GET /finanzas/facturas/{id}/desglose/` (más el
 * retrieve, para `activo` y las acciones de PDF y correo).
 *
 * Cuelga del módulo (`/finance/invoicing/[id]`). Por el `startsWith` del proxy
 * cae en la regla `/finance/invoicing` de `routePermissions.ts` y exige
 * `R-CONTABILIDAD-FACTURACION`; junto con el matcher `/finance/:path*` de
 * `proxy.ts` no hace falta registrar nada. Tampoco tiene entrada en
 * `appRoutes.ts` (convención de los detalles de OC, OB, OR, CM y OP): el
 * sub-grupo, la hoja activa del sidebar y el título ("Facturación") se
 * resuelven por prefijo.
 *
 * A esta ruta enlazan el listado de facturas (`?from=invoicing`), "Documentos
 * relacionados" del detalle de pedido (`?from=order&pedido=…`), la búsqueda
 * global (sin `from`) y las parcialidades entre sí (conservan el origen). La
 * hoja activa ("Factura" o "Seguimiento") va en `?sheet=`.
 */
export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  // Una llave repetida llega como arreglo: se toma solo un valor de texto. Los
  // valores siguen CRUDOS; el detalle los valida al resolver hoja y "Volver".
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  const detailQuery: InvoiceDetailQuery = {
    from: first(query.from),
    pedido: first(query.pedido),
    sheet: first(query.sheet),
  };

  return (
    <div className="w-full space-y-6 pt-2">
      <InvoiceDetailPageContent invoiceId={id} query={detailQuery} />
    </div>
  );
}
