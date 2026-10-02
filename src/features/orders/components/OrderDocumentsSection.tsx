import { EmptyLines, Section, textOrDash } from "@/src/components/DetailDialogPrimitives";
import { formatShortDate } from "@/src/utils/formatDate";
import { ORIGIN_BADGE_CLASS } from "../constants/pedidoStatus";
import type { PedidoDocumento, PedidoFolioPicking } from "../interfaces/order.interface";
import {
  hasOrderDocumentDialog,
  PACKING_DOC_TIPO,
  PICKING_DOC_TIPO,
  type OpenOrderDocument,
} from "./orderDocumentDialogs";

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
 */
export function OrderDocumentsSection({
  documentos,
  foliosPicking,
  onOpenDoc,
}: {
  documentos: PedidoDocumento[];
  foliosPicking: PedidoFolioPicking[];
  onOpenDoc: (doc: OpenOrderDocument) => void;
}) {
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
                // Clicable solo si su tipo tiene un diálogo de detalle
                // registrado; el resto queda como texto estático.
                const isClickable = hasOrderDocumentDialog(doc.tipo);
                const folio = isStub || isMovimiento ? "—" : textOrDash(doc.folio);
                const fecha = isStub ? "—" : formatShortDate(doc.fecha);
                const showEstatus = !isStub && !isMovimiento && doc.estatus;
                const label = docLabel(doc);
                return (
                  <tr
                    key={`${doc.tipo}-${doc.id}`}
                    className="border-t border-slate-100 dark:border-white/10 align-top"
                  >
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                      {isClickable ? (
                        <button
                          type="button"
                          onClick={() => onOpenDoc({ tipo: doc.tipo, id: doc.id })}
                          className="text-sky-600 dark:text-sky-400 hover:underline hover:text-sky-700 dark:hover:text-sky-300 cursor-pointer font-medium text-left transition-colors"
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
