"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import toast from "react-hot-toast";
import { Button } from "@/src/components/Button";
import { FormInput } from "@/src/components/FormInput";
import { EmptyLines, LineItemsTable, SectionTitle } from "@/src/components/DetailDialogPrimitives";
import { formatMoneyValueOrDash, formatQuantityValue } from "@/src/utils/formatCurrency";
import type { FacturaProveedor } from "../interfaces/supplier-invoice.interface";
import { facturaLineaProducto, facturaLineaReferencias } from "../utils/supplierInvoiceLabels";
import {
  AJUSTE_CAMPOS,
  ajusteLineaCentavos,
  ajusteLineaError,
  ajusteMaquilaCambios,
  ajusteValoresIniciales,
  ivaDeLinea,
  type AjusteCampo,
  type AjusteLineaValores,
} from "../utils/ajusteMaquila";
import { useAjustarFacturaMaquila } from "../hooks/useAjustarFacturaMaquila";

/** Renglón del formulario: los importes capturados y el id de su línea. */
type AjusteFormLinea = AjusteLineaValores & { id: number };

const valoresPorLinea = (lineas: readonly AjusteFormLinea[]): Record<string, AjusteLineaValores> =>
  Object.fromEntries(lineas.map(({ id, ...valores }) => [String(id), valores]));

const CAMPO_LABEL: Record<AjusteCampo, string> = {
  precio_unitario: "Precio",
  descuento: "Descuento",
  impuesto: "Impuesto",
};

const th = "px-3 py-2 font-medium";
const tdNum = "px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300";

/** Producto del renglón (o la descripción de maquila) y su código. */
function LineaProducto({ linea }: { linea: FacturaProveedor["factura_proveedor_detalles"][number] }) {
  return (
    <td className="px-3 py-2 text-xs text-slate-700 dark:text-slate-200">
      <span className="block font-medium">{facturaLineaProducto(linea)}</span>
      {linea.producto_codigo && (
        <span className="block font-mono text-[11px] text-slate-400">{linea.producto_codigo}</span>
      )}
    </td>
  );
}

/**
 * Edición en línea del ajuste de maquila (EC-919): precio, descuento e impuesto
 * de cada línea, con subtotal y total recalculados al capturar. "IVA 16 %"
 * propone el impuesto de cada línea como monto (16 % de su base gravable); se
 * puede corregir a mano. Solo viaja lo que cambió.
 */
function MaquilaLinesEditor({ factura, onDone }: { factura: FacturaProveedor; onDone: () => void }) {
  const lineas = factura.factura_proveedor_detalles;
  const lineaPorId = new Map(lineas.map((l) => [l.id, l]));
  const ajustar = useAjustarFacturaMaquila();
  const money = (cents: number) => formatMoneyValueOrDash(String(cents / 100), factura.moneda_codigo);

  const form = useForm({
    // Cada renglón del formulario lleva el id de su línea: si un refetch cambia
    // el orden de `lineas`, lo capturado sigue en su línea.
    defaultValues: {
      lineas: lineas.map((l): AjusteFormLinea => ({ id: l.id, ...ajusteValoresIniciales(l) })),
    },
    onSubmit: ({ value }) => {
      const porId = valoresPorLinea(value.lineas);
      if (lineas.some((l) => ajusteLineaError(l.cantidad, porId[String(l.id)] ?? ajusteValoresIniciales(l)))) {
        return;
      }
      const cambios = ajusteMaquilaCambios(lineas, porId);
      if (cambios.length === 0) {
        toast("Sin cambios que guardar.", { id: `ajuste-maquila-sin-cambios-${factura.id}` });
        return;
      }
      ajustar.mutate({ id: factura.id, payload: { lineas: cambios } }, { onSuccess: onDone });
    },
  });

  const aplicarIva = () => {
    const cantidades = new Map(lineas.map((l) => [l.id, l.cantidad]));
    form.state.values.lineas.forEach((valores, i) => {
      const cantidad = cantidades.get(valores.id);
      if (cantidad !== undefined) form.setFieldValue(`lineas[${i}].impuesto`, ivaDeLinea(cantidad, valores));
    });
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <fieldset disabled={ajustar.isPending} className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cuadra cada línea con la factura del maquilero. El impuesto es un monto, no una tasa.
          </p>
          <Button type="button" variant="secondary" rounded="full" onClick={aplicarIva}>
            IVA 16 %
          </Button>
        </div>

        <form.Subscribe selector={(state) => state.values.lineas}>
          {(valores) => (
            <LineItemsTable
              head={
                <>
                  <th className={th}>Producto</th>
                  <th className={`${th} text-right`}>Cantidad</th>
                  {AJUSTE_CAMPOS.map((campo) => (
                    <th key={campo} className={`${th} text-right`}>
                      {CAMPO_LABEL[campo]}
                    </th>
                  ))}
                  <th className={`${th} text-right`}>Subtotal</th>
                  <th className={`${th} text-right`}>Total</th>
                </>
              }
            >
              {valores.map((actual, i) => {
                const linea = lineaPorId.get(actual.id);
                if (!linea) return null;
                const { subtotal, total } = ajusteLineaCentavos(linea.cantidad, actual);
                const error = ajusteLineaError(linea.cantidad, actual);
                const nombre = facturaLineaProducto(linea);
                return (
                  <tr key={linea.id} className="align-top">
                    <LineaProducto linea={linea} />
                    <td className={tdNum}>{formatQuantityValue(linea.cantidad)}</td>
                    {AJUSTE_CAMPOS.map((campo) => (
                      <td key={campo} className="px-2 py-1.5 w-28">
                        <form.Field name={`lineas[${i}].${campo}`}>
                          {(field) => (
                            <FormInput
                              variant="compact"
                              inputMode="decimal"
                              aria-label={`${CAMPO_LABEL[campo]} de ${nombre}`}
                              aria-invalid={error !== null || undefined}
                              className="text-right tabular-nums"
                              value={field.state.value}
                              onChange={(event) => field.handleChange(event.target.value)}
                              onBlur={field.handleBlur}
                            />
                          )}
                        </form.Field>
                      </td>
                    ))}
                    <td className={tdNum}>{money(subtotal)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white">
                      {money(total)}
                      {error && (
                        <span role="alert" className="block text-[11px] font-medium text-red-600 dark:text-red-400">
                          {error}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </LineItemsTable>
          )}
        </form.Subscribe>

        <form.Subscribe selector={(state) => state.values.lineas}>
          {(valores) => {
            const conLinea = valores.flatMap((v) => {
              const linea = lineaPorId.get(v.id);
              return linea ? [{ cantidad: linea.cantidad, v }] : [];
            });
            const totalCents = conLinea.reduce(
              (acc, { cantidad, v }) => acc + ajusteLineaCentavos(cantidad, v).total,
              0,
            );
            const conError = conLinea.some(({ cantidad, v }) => ajusteLineaError(cantidad, v) !== null);
            return (
              <div className="flex flex-wrap items-center justify-end gap-3">
                <span className="text-sm text-slate-600 dark:text-slate-300">
                  Total ajustado <b className="tabular-nums text-slate-900 dark:text-white">{money(totalCents)}</b>
                </span>
                <Button type="button" variant="ghost" rounded="full" onClick={onDone}>
                  Descartar
                </Button>
                <Button type="submit" variant="primary" rounded="full" disabled={conError || ajustar.isPending}>
                  {ajustar.isPending ? "Guardando..." : "Guardar ajuste"}
                </Button>
              </div>
            );
          }}
        </form.Subscribe>
      </fieldset>
    </form>
  );
}

/**
 * Partidas de la factura de proveedor. Cada renglón dice qué se facturó (el
 * producto, o la descripción del renglón de maquila sin producto) y sus
 * renglones de OC / recepción, "—" donde no hay (la de maquila no tiene OC).
 *
 * `canAdjust` (factura de maquila en Borrador y permiso de escritura de
 * finanzas, EC-919) ofrece ajustar sus líneas a la factura del maquilero.
 */
export function SupplierInvoiceLines({
  factura,
  canAdjust,
}: {
  factura: FacturaProveedor;
  canAdjust: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const lineas = factura.factura_proveedor_detalles;
  const money = (value: string) => formatMoneyValueOrDash(value, factura.moneda_codigo);
  // Si la factura deja de ser ajustable (otra persona la registró, la sesión
  // se recupera…), sale de edición y no vuelve a abrirla sola. Ajuste en render.
  if (editing && !canAdjust) setEditing(false);
  const editando = editing && canAdjust;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionTitle>Partidas</SectionTitle>
        {canAdjust && !editando && lineas.length > 0 && (
          <Button type="button" variant="secondary" rounded="full" onClick={() => setEditing(true)}>
            Ajustar a la factura del maquilero
          </Button>
        )}
      </div>
      {lineas.length === 0 ? (
        <EmptyLines>Esta factura no tiene partidas.</EmptyLines>
      ) : editando ? (
        // Se monta al entrar en edición, con los importes vigentes. La `key` es
        // solo el id: un refetch (p. ej. adjuntar el PDF) no borra lo capturado.
        <MaquilaLinesEditor
          key={factura.id}
          factura={factura}
          onDone={() => setEditing(false)}
        />
      ) : (
        <LineItemsTable
          head={
            <>
              <th className={th}>Producto</th>
              <th className={th}>Detalle OC / Recepción</th>
              <th className={`${th} text-right`}>Cantidad</th>
              <th className={`${th} text-right`}>Precio</th>
              <th className={`${th} text-right`}>Descuento</th>
              <th className={`${th} text-right`}>Subtotal</th>
              <th className={`${th} text-right`}>Impuesto</th>
              <th className={`${th} text-right`}>Total</th>
            </>
          }
        >
          {lineas.map((linea) => (
            <tr key={linea.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
              <LineaProducto linea={linea} />
              <td className="px-3 py-2 font-mono text-xs text-slate-500 dark:text-slate-400">
                {facturaLineaReferencias(linea)}
              </td>
              <td className={tdNum}>{formatQuantityValue(linea.cantidad)}</td>
              <td className={tdNum}>{money(linea.precio_unitario)}</td>
              <td className={tdNum}>{money(linea.descuento)}</td>
              <td className={tdNum}>{money(linea.subtotal)}</td>
              <td className={tdNum}>{money(linea.impuesto)}</td>
              <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white">
                {money(linea.total)}
              </td>
            </tr>
          ))}
        </LineItemsTable>
      )}
    </div>
  );
}
