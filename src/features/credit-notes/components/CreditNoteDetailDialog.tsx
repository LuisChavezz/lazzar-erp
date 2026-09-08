"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { StatusBadge } from "@/src/components/StatusBadge";
import { ErrorState } from "@/src/components/ErrorState";
import { LoadingSkeleton } from "@/src/components/LoadingSkeleton";
import {
  EmptyLines,
  InfoField,
  LineItemsTable,
  SectionTitle,
  textOrDash,
} from "@/src/components/DetailDialogPrimitives";
import { NotaCreditoIcon } from "@/src/components/Icons";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import {
  formatMoneyValueOrDash,
  formatQuantityValue,
} from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import { useInvoiceDetail } from "@/src/features/invoicing/hooks/useInvoiceDetail";
import { NOTA_CREDITO_ESTATUS_CONFIG } from "../constants/creditNoteStatus";
import type { NotaCredito } from "../interfaces/credit-note.interface";

/** Importe en crudo, con dos decimales y sin símbolo: para cuando la moneda del
 *  documento aún no se conoce (ver `money` más abajo). */
const IMPORTE_SIN_MONEDA: Intl.NumberFormatOptions = {
  style: "decimal",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};

interface CreditNoteDetailDialogProps {
  /**
   * La nota ya cargada por el listado — sin fetch propio de la cabecera ni de
   * las líneas: `GET /finanzas/notas-credito/` y el retrieve comparten el mismo
   * `NotaCreditoSerializer`, y `nota_credito_detalles` viene anidado en ambos.
   */
  nota: NotaCredito;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreditNoteDetailDialog({
  nota,
  open,
  onOpenChange,
}: CreditNoteDetailDialogProps) {
  /**
   * La FACTURA sí necesita su propia consulta, por dos razones que se resuelven
   * de una sola vez:
   *
   *  1. La línea de la nota solo expone `factura_detalle` como id. "Concepto
   *     #47" no le dice nada a nadie: el nombre del producto y lo que se facturó
   *     originalmente viven en `factura_detalles`.
   *  2. `NotaCredito` no tiene campo de moneda. Sin la factura, los importes
   *     tendrían que pintarse con el MXN por defecto (como hace el listado, que
   *     no puede permitirse una consulta por fila). Aquí `moneda_nombre` —el
   *     `codigo_iso` de la moneda de la factura— llega gratis con la misma
   *     consulta que ya hacía falta por (1).
   *
   * `useInvoiceDetail` está compartido con el selector de conceptos del alta y
   * usa la misma llave de caché, así que abrir el detalle de una nota que se
   * acaba de crear no vuelve a pedir la factura.
   */
  const {
    data: factura,
    isLoading,
    isError,
    error,
  } = useInvoiceDetail(nota.factura);

  const monedaFormato = factura?.moneda_nombre
    ? { currency: factura.moneda_nombre }
    : undefined;

  /**
   * Formatea un importe SIN comprometerse con una moneda que todavía no se
   * conoce.
   *
   * Sin `currency`, `formatCurrency` cae a su MXN por defecto: mientras la
   * factura carga —y PARA SIEMPRE si su consulta falla— una nota sobre una
   * factura en USD se pintaría con símbolo de pesos, y nada en la pantalla
   * delataría el error. Se pinta el número con dos decimales y sin símbolo, que
   * es el mismo recurso que ya usa `formatCurrency` cuando el código de moneda
   * no es un ISO 4217 válido; `style: "decimal"` desactiva el formato de moneda,
   * así que el `currency: "MXN"` que ese helper mezcla queda ignorado.
   */
  const money = (value: string) =>
    formatMoneyValueOrDash(value, monedaFormato ?? IMPORTE_SIN_MONEDA);

  /** Concepto de la factura al que apunta una línea, si la factura ya cargó. */
  const conceptoDe = (facturaDetalleId: number) =>
    factura?.factura_detalles.find((detalle) => detalle.id === facturaDetalleId);

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="900px"
      showCloseButton={true}
      title={
        <div className="flex items-center gap-2.5 pr-8">
          <NotaCreditoIcon className="w-5 h-5 text-violet-500 shrink-0" />
          <div>
            <p className="text-base font-semibold leading-tight text-slate-800 dark:text-slate-100">
              Detalle de la Nota de Crédito
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono font-normal mt-0.5">
              {nota.folio || `#${nota.id}`}
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Cabecera: sale del renglón que el listado ya cargó. */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 text-xs">
          <InfoField label="Cliente">{textOrDash(nota.cliente_nombre)}</InfoField>
          <InfoField label="Factura">
            {textOrDash(nota.factura_folio) === "—"
              ? `#${nota.factura}`
              : nota.factura_folio}
          </InfoField>
          <InfoField label="Fecha de emisión">
            {/* `timeZone: "UTC"`: fecha-calendario "YYYY-MM-DD". La fija el
                backend (`auto_now_add`) y es nullable en el modelo. */}
            {nota.fecha_emision
              ? formatShortDate(nota.fecha_emision, { timeZone: "UTC" })
              : "—"}
          </InfoField>
          <InfoField label="Motivo">{textOrDash(nota.motivo)}</InfoField>
          <InfoField label="Subtotal">
            <span className="tabular-nums">{money(nota.subtotal)}</span>
          </InfoField>
          <InfoField label="Impuestos">
            <span className="tabular-nums">{money(nota.impuestos)}</span>
          </InfoField>
          <InfoField label="Total acreditado">
            <span className="tabular-nums font-semibold">{money(nota.total)}</span>
          </InfoField>
          <InfoField label="Estatus">
            <StatusBadge
              status={nota.estatus}
              config={NOTA_CREDITO_ESTATUS_CONFIG}
            />
          </InfoField>
        </div>

        {/* La moneda vive en la factura, no en la nota. Si la consulta ya
            terminó y aun así no se conoce —falló, o la factura no la expone—,
            los importes quedan sin símbolo para siempre; se dice por qué, en
            lugar de dejar al usuario mirando números pelones. Durante la carga
            no se avisa nada: el estado es momentáneo. */}
        {!isLoading && !monedaFormato && (
          <p className="text-xs text-amber-600 dark:text-amber-400 px-1">
            Importes sin símbolo de moneda: no se pudo determinar la moneda de la
            factura.
          </p>
        )}

        {/* Qué significa el estatus en términos de saldo, que es lo que el
            usuario necesita saber al abrir el documento. */}
        <p className="text-xs text-slate-500 dark:text-slate-400 px-1">
          {nota.estatus === "Emitida"
            ? `Esta nota descontó ${money(nota.total)} del saldo por cobrar de la factura.`
            : nota.estatus === "Borrador"
              ? "Este borrador no ha tocado el saldo por cobrar de la factura."
              : "Esta nota está cancelada; si había acreditado un importe, ya se devolvió al saldo de la factura."}
        </p>

        {nota.observaciones && (
          <div>
            <SectionTitle>Observaciones</SectionTitle>
            <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line">
              {nota.observaciones}
            </p>
          </div>
        )}

        {/* ── Conceptos acreditados ───────────────────────────────────── */}
        <div>
          <SectionTitle>Conceptos acreditados</SectionTitle>
          {nota.nota_credito_detalles.length === 0 ? (
            <EmptyLines>
              Esta nota no desglosa conceptos. El importe acreditado es el total del
              documento.
            </EmptyLines>
          ) : (
            <>
              {/* Los tres estados de la consulta de la factura se resuelven DENTRO
                  de la sección: el diálogo (y su cabecera, que ya tiene todos sus
                  datos) nunca se desmonta por un fallo de esta consulta
                  secundaria. Ante un error se pinta el aviso y la tabla igual,
                  con los ids en lugar de los nombres. */}
              {isError && (
                <div className="mb-3">
                  <ErrorState
                    title="No se pudo cargar la factura"
                    message={extractErrorMessage(
                      error,
                      "Los conceptos se muestran sin nombre de producto.",
                    )}
                  />
                </div>
              )}
              {isLoading ? (
                <LoadingSkeleton className="h-24" />
              ) : (
                <LineItemsTable
                  head={
                    <>
                      <th className="px-3 py-2 font-medium">Concepto</th>
                      <th className="px-3 py-2 font-medium text-right">Cantidad</th>
                      <th className="px-3 py-2 font-medium text-right">
                        Precio unitario
                      </th>
                      <th className="px-3 py-2 font-medium text-right">Impuesto</th>
                      <th className="px-3 py-2 font-medium text-right">Subtotal</th>
                      <th className="px-3 py-2 font-medium text-right">Total</th>
                    </>
                  }
                >
                  {nota.nota_credito_detalles.map((linea) => {
                    const concepto = conceptoDe(linea.factura_detalle);
                    return (
                      <tr
                        key={linea.id}
                        className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                      >
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                          {concepto?.producto_nombre ?? (
                            <span className="font-mono text-xs">
                              {`Concepto #${linea.factura_detalle}`}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                          {formatQuantityValue(linea.cantidad)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                          {money(linea.precio_unitario)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                          {money(linea.impuesto)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                          {money(linea.subtotal)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white">
                          {money(linea.total)}
                        </td>
                      </tr>
                    );
                  })}
                </LineItemsTable>
              )}
              {/* El desglose es DOCUMENTAL: el importe que movió el saldo es
                  `nota.total`, no esta suma. Se dice explícitamente para que
                  nadie lea la tabla como el origen del crédito. */}
              <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                El desglose es informativo. El importe acreditado a la factura es el
                total de la nota.
              </p>
            </>
          )}
        </div>
      </div>
    </MainDialog>
  );
}
