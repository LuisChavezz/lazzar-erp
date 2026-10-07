import Link from "next/link";
import { useSession } from "next-auth/react";
import { EmptyLines, Section, textOrDash } from "@/src/components/DetailDialogPrimitives";
import { formatShortDate } from "@/src/utils/formatDate";
import { canAccessRoute } from "@/src/utils/routeAccess";
import { ORIGIN_BADGE_CLASS } from "../constants/pedidoStatus";
import type { PedidoDocumento, PedidoFolioPicking } from "../interfaces/order.interface";
import {
  getOrderDocumentRoute,
  hasOrderDocumentDialog,
  PACKING_DOC_TIPO,
  PICKING_DOC_TIPO,
  type OpenOrderDocument,
} from "./orderDocumentDialogs";

const DOC_LINK_CLASS =
  "text-sky-600 dark:text-sky-400 hover:underline hover:text-sky-700 dark:hover:text-sky-300 cursor-pointer font-medium text-left transition-colors";

/**
 * Tipos stub: sus `folio` y `fecha` son el PK crudo (`str(id)`), no datos
 * reales. Para estos NO se muestra folio, fecha ni estatus.
 */
const STUB_DOCUMENTO_TIPOS = new Set(["envio", "entrega", "devolucion"]);

// `movimiento_inventario`: sin folio real (es `str(id)`) pero con fecha real
// (`fecha_movimiento`); su `estatus` siempre viene `null`.
const MOVIMIENTO_INVENTARIO_TIPO = "movimiento_inventario";

/**
 * Etiqueta visible por `doc.tipo` que reemplaza el `doc.label` del backend
 * ("Picking (WMS)" / "Packing (WMS)") por el término de la UI.
 */
const DOC_LABEL_OVERRIDES: Record<string, string> = {
  [PICKING_DOC_TIPO]: "Surtido (WMS)",
  [PACKING_DOC_TIPO]: "Embarque (WMS)",
};

/**
 * Fecha visible de un documento. El backend manda `isoformat()` del campo de
 * fecha de cada tipo (`pedido_documentos_service`), así que la FORMA del valor
 * dice si es fecha de calendario o datetime:
 *  - "YYYY-MM-DD" (DateField): factura `fecha_emision`, orden de compra
 *    `fecha_oc`. Se formatea en UTC; sin ella, `new Date("2026-10-07")` es
 *    medianoche UTC y en México se pinta el día anterior.
 *  - datetime con hora (DateTimeField): cotización y packing `created_at`,
 *    órdenes de producción/bordado/reflejante/corte de manga y picking
 *    `fecha_inicio`, movimiento `fecha_movimiento`. Se deja en la zona local.
 */
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const formatDocFecha = (fecha: string | null): string =>
  fecha && DATE_ONLY_RE.test(fecha)
    ? formatShortDate(fecha, { timeZone: "UTC" })
    : formatShortDate(fecha);

const docLabel = (doc: PedidoDocumento): string =>
  Object.hasOwn(DOC_LABEL_OVERRIDES, doc.tipo) ? DOC_LABEL_OVERRIDES[doc.tipo] : doc.label;

/**
 * Timestamp para ordenar (desc). `null` cuando el documento no tiene una fecha
 * real (stubs, o fecha ausente/no parseable): esos van al fondo.
 */
function docSortTime(doc: PedidoDocumento): number | null {
  if (STUB_DOCUMENTO_TIPOS.has(doc.tipo) || !doc.fecha) return null;
  const time = new Date(doc.fecha).getTime();
  return Number.isNaN(time) ? null : time;
}

/** Badge neutro para el estatus del documento (sin mapa de color por tipo). */
function DocEstatusBadge({ estatus }: { estatus: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${ORIGIN_BADGE_CLASS}`}
    >
      {estatus}
    </span>
  );
}

/**
 * Documentos relacionados del pedido, con sus diálogos de detalle.
 *
 * Un picking que ya aparece en "Folios de surtido" (misma hoja) no se repite
 * aquí: se oculta SOLO la entrada `picking` cuyo id está en `folios_picking`.
 * Una entrada `picking` que no esté ahí (p. ej. si `folios_picking` excluye
 * algún estado que `documentos` sí lista) se conserva, para no perder rastro de
 * ningún documento.
 *
 * Los tipos con página propia (`ORDER_DOCUMENT_ROUTES`, hoy la factura)
 * enlazan a ella solo si el usuario puede abrir esa ruta; si no, quedan como
 * texto. Los tipos con diálogo lo abren como siempre.
 */
export function OrderDocumentsSection({
  pedidoId,
  documentos,
  foliosPicking,
  onOpenDoc,
}: {
  /** Pedido dueño de los documentos: el "Volver" de una página lo trae de regreso. */
  pedidoId: number;
  documentos: PedidoDocumento[];
  foliosPicking: PedidoFolioPicking[];
  onOpenDoc: (doc: OpenOrderDocument) => void;
}) {
  const { data: session } = useSession();
  const folioIds = new Set(foliosPicking.map((folio) => folio.id));
  const visibles = documentos.filter(
    (doc) => !(doc.tipo === PICKING_DOC_TIPO && folioIds.has(doc.id)),
  );

  // Orden: fecha descendente; los que no tienen fecha real (stubs) al fondo.
  const ordenados = [...visibles].sort((a, b) => {
    const ta = docSortTime(a);
    const tb = docSortTime(b);
    if (ta === null && tb === null) return 0;
    if (ta === null) return 1;
    if (tb === null) return -1;
    return tb - ta;
  });

  return (
    <Section title="Documentos relacionados">
      {ordenados.length === 0 ? (
        // Vacía solo porque sus `picking` ya están en Folios de surtido: se dice
        // dónde están, en vez de afirmar que el pedido no tiene documentos.
        <EmptyLines>
          {documentos.length > 0
            ? "Los surtidos de este pedido están en Folios de surtido."
            : "Sin documentos relacionados."}
        </EmptyLines>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 dark:bg-white/5">
              <tr className="text-slate-500 dark:text-slate-400">
                <th className="px-3 py-2 text-left font-semibold">Tipo</th>
                <th className="px-3 py-2 text-left font-semibold">Folio</th>
                <th className="px-3 py-2 text-left font-semibold">Fecha</th>
                <th className="px-3 py-2 text-left font-semibold">Estatus</th>
              </tr>
            </thead>
            <tbody>
              {ordenados.map((doc) => {
                const isStub = STUB_DOCUMENTO_TIPOS.has(doc.tipo);
                const isMovimiento = doc.tipo === MOVIMIENTO_INVENTARIO_TIPO;
                // Página propia (si el usuario puede abrirla) o diálogo de
                // detalle registrado; el resto queda como texto estático.
                const route = getOrderDocumentRoute(doc.tipo);
                const href =
                  route && canAccessRoute(route.path(doc.id), session?.user)
                    ? route.href(doc.id, pedidoId)
                    : null;
                const hasDialog = !route && hasOrderDocumentDialog(doc.tipo);
                const folio = isStub || isMovimiento ? "—" : textOrDash(doc.folio);
                const fecha = isStub ? "—" : formatDocFecha(doc.fecha);
                const showEstatus = !isStub && !isMovimiento && doc.estatus;
                const label = docLabel(doc);
                return (
                  <tr
                    key={`${doc.tipo}-${doc.id}`}
                    className="border-t border-slate-100 dark:border-white/10 align-top"
                  >
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                      {href ? (
                        <Link href={href} className={DOC_LINK_CLASS} title={`Ver detalle: ${label}`}>
                          {label}
                        </Link>
                      ) : hasDialog ? (
                        <button
                          type="button"
                          onClick={() => onOpenDoc({ tipo: doc.tipo, id: doc.id })}
                          className={DOC_LINK_CLASS}
                          title={`Ver detalle: ${label}`}
                        >
                          {label}
                        </button>
                      ) : (
                        label
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {folio}
                    </td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {fecha}
                    </td>
                    <td className="px-3 py-2">
                      {showEstatus ? (
                        <DocEstatusBadge estatus={doc.estatus as string} />
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}
