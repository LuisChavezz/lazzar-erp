"use client";

import { useState } from "react";
import { Button } from "@/src/components/Button";
import { FormInput } from "@/src/components/FormInput";
import { MainDialog } from "@/src/components/MainDialog";
import { ExclamationTriangleIcon } from "@/src/components/Icons";
import { formatCurrency, formatMoneyValueOrDash } from "@/src/utils/formatCurrency";
import type { PedidoDetail } from "../interfaces/order.interface";
import type { MergeCollision } from "../hooks/usePedidoMesaControlEditForm";

/**
 * Confirmación destructiva de la edición de un pedido por Mesa de Control.
 *
 * Guardar aquí NO es una actualización incremental: el backend BORRA los
 * renglones del pedido y los recrea, y todo lo que cuelga de ellos por CASCADE
 * se va con ellos. Por eso la confirmación pide un gesto deliberado —teclear el
 * folio real— en vez de un simple "Aceptar", que se acepta por inercia.
 *
 * No se usa `ConfirmDialog` porque ese componente no admite un campo de
 * captura: su contrato es título + descripción + botón. Se construye sobre
 * `MainDialog` con `showCloseButton={false}` para poder poner el par
 * Cancelar / Guardar en el orden correcto (la acción destructiva en rojo, no el
 * cierre).
 */

/**
 * Registros que el borrado-y-recreado del detalle se lleva por CASCADE.
 *
 * TODAS las FK con `on_delete=CASCADE` que apuntan a `PedidoDetalle` son de
 * tablas de RENGLÓN, nunca de cabecera: `wms.PickingDetalle`,
 * `finanzas.FacturaDetalle`, `inventarios.InventarioReserva`,
 * `produccion.OrdenProduccionDetalle` / `OrdenBordadoDetalle` /
 * `OrdenReflejanteDetalle` / `OrdenCorteMangaDetalle`, `ventas.EntregaDetalle` y
 * `ventas.DevolucionDetalle`.
 *
 * Consecuencia que la redacción tiene que respetar: el folio de picking, la
 * factura y la orden de producción NO se borran — se quedan, VACÍOS. Decir "se
 * eliminan los folios de picking" sería falso y describiría un daño distinto del
 * real (uno recuperable por otro camino).
 */
const CASCADE_RISKS = [
  "Los renglones de los folios de picking (el folio queda sin líneas, no se borra)",
  "Los renglones de factura ligados al pedido",
  "Las reservas de inventario",
  "Los renglones de las órdenes de producción, bordado, reflejante y corte de manga",
  "Los renglones de entregas y devoluciones registradas",
];

interface PedidoMesaControlConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedido: PedidoDetail;
  /** Gran total que el formulario va a GUARDAR (recalculado en el cliente). */
  granTotal: number;
  /** Partidas que el backend fusionaría al guardar (`_merge_detalle`). */
  mergeCollisions: MergeCollision[];
  onConfirm: () => void;
  isPending: boolean;
}

export function PedidoMesaControlConfirmDialog({
  open,
  onOpenChange,
  pedido,
  granTotal,
  mergeCollisions,
  onConfirm,
  isPending,
}: PedidoMesaControlConfirmDialogProps) {
  /**
   * Cada apertura empieza en blanco. No hace falta resetear al cerrar: el
   * wrapper MONTA este componente solo mientras está abierto, así que el estado
   * nace vacío en cada apertura. Es lo que evita que una segunda confirmación se
   * dispare sin volver a teclear el folio — y lo que evita el `useEffect` de
   * reseteo, que el linter rechaza por `set-state-in-effect`.
   */
  const [typedFolio, setTypedFolio] = useState("");

  /**
   * `folio` es `string | null` en el contrato. Con `null` no hay nada que
   * teclear (el placeholder "—" no es un folio), así que se cae a una
   * confirmación simple en vez de dejar el botón bloqueado para siempre. En la
   * práctica no debería ocurrir —el pedido se folia al crearse—, pero el tipo lo
   * admite y el camino tiene que existir.
   */
  const folio = pedido.folio?.trim() ?? "";
  const requiresFolioMatch = folio.length > 0;
  const typedFolioTrimmed = typedFolio.trim();
  const folioMatches = !requiresFolioMatch || typedFolioTrimmed === folio;

  /**
   * `detalles` es el ÚNICO conteo que se pinta aquí, y es el que de verdad
   * describe el alcance del borrado: son los renglones que se van a destruir y
   * recrear, y de los que cuelga todo lo de `CASCADE_RISKS`.
   *
   * NO se muestran `documentos` ni `folios_picking`, que estuvieron aquí, por
   * dos motivos independientes y cada uno suficiente:
   *
   *   1. NO cuentan lo que se borra. Son CABECERAS de documento; el cascade
   *      solo se lleva sus renglones (ver `CASCADE_RISKS`). Ponerlos junto a la
   *      lista de riesgos sugería una correspondencia que no existe: "3
   *      documentos" no son 3 cosas que vayan a desaparecer.
   *   2. Un `0` suyo no es fiable. `PedidoSerializer.get_documentos` y
   *      `get_folios_picking` envuelven su cálculo en `except Exception: return
   *      []`, así que un cero puede significar "no hay" o "la consulta falló en
   *      silencio" — indistinguibles desde aquí. Un aviso destructivo no puede
   *      apoyarse en un número que quizá sea un fallo disfrazado.
   *
   * `detalles` no comparte ninguno de los dos problemas: `get_detalles` serializa
   * sin try/except (solo protege el cálculo de avance de picking), así que su
   * longitud es un dato real.
   */
  const lineasCount = pedido.detalles.length;

  /**
   * El gran total que se va a guardar contra el que está guardado hoy.
   *
   * No siempre coinciden aunque no se toque nada, y no por redondeo: al
   * autorizar una cotización el backend copia sus servicios extra SIN la
   * `cantidad` (`PedidoServicioExtra.cantidad` cae al default 1), mientras que
   * el `gran_total` se copia verbatim con la cantidad original ya sumada. El
   * formulario recalcula desde lo que el PEDIDO realmente tiene, así que un
   * servicio que valía 3 unidades vuelve a valer 1 y el total baja.
   *
   * No se puede reconstruir la cantidad perdida desde el frontend, así que la
   * diferencia se ENSEÑA antes de confirmar en vez de aplicarse en silencio.
   * `1` centavo de tolerancia para no gritar por un redondeo.
   */
  const storedGranTotal = Number(pedido.gran_total);
  const granTotalDiffers =
    Number.isFinite(storedGranTotal) && Math.abs(storedGranTotal - granTotal) >= 0.01;

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="560px"
      showCloseButton={false}
      title={
        <span className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
          <ExclamationTriangleIcon className="w-5 h-5" aria-hidden="true" />
          Confirmar edición del pedido
        </span>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-rose-200 dark:border-rose-500/20 bg-rose-50/60 dark:bg-rose-500/5 p-4 space-y-3">
          <p className="text-sm text-slate-700 dark:text-slate-200">
            Al guardar, el detalle del pedido{" "}
            <span className="font-mono font-semibold">{pedido.folio || `#${pedido.id}`}</span>{" "}
            se <strong>borra y se vuelve a crear</strong>. Se eliminarán de forma
            permanente los registros ligados a sus {lineasCount}{" "}
            {lineasCount === 1 ? "línea" : "líneas"} actuales:
          </p>
          <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
            {CASCADE_RISKS.map((risk) => (
              <li key={risk} className="flex gap-2">
                <span aria-hidden="true" className="text-rose-500">
                  •
                </span>
                <span>{risk}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs font-medium text-rose-700 dark:text-rose-300">
            Revisa antes los documentos relacionados del pedido: esta pantalla no
            puede decirte con certeza cuántos renglones se verán afectados.
          </p>
        </div>

        {mergeCollisions.length > 0 && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50/60 dark:bg-amber-500/5 p-4 space-y-2">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              {mergeCollisions.length === 1
                ? "Dos partidas se van a fusionar en una."
                : "Hay partidas que se van a fusionar."}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              El servidor agrupa las partidas que coinciden en producto, color,
              dirección y tallas — <strong>sin mirar el precio</strong>. Se quedará
              con el precio de la primera y sumará las cantidades:
            </p>
            <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
              {mergeCollisions.map((collision) => (
                <li key={collision.posiciones.join("-")} className="flex gap-2">
                  <span aria-hidden="true" className="text-amber-500">
                    •
                  </span>
                  <span>
                    {collision.descripcion} — partidas {collision.posiciones.join(", ")}
                    {collision.precios.length > 1 && (
                      <>
                        {" "}
                        (precios{" "}
                        <span className="font-mono">{collision.precios.join(" / ")}</span>
                        ; solo sobrevive el primero)
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {granTotalDiffers && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50/60 dark:bg-amber-500/5 p-4 space-y-1">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              El gran total va a cambiar.
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Guardado hoy:{" "}
              <span className="font-mono font-semibold">
                {formatMoneyValueOrDash(pedido.gran_total)}
              </span>{" "}
              → se guardará:{" "}
              <span className="font-mono font-semibold">{formatCurrency(granTotal)}</span>
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Suele deberse a servicios extra cuya cantidad no se copió al crear el
              pedido. Verifica el importe antes de continuar.
            </p>
          </div>
        )}

        <p className="text-xs text-slate-500 dark:text-slate-400">
          La cotización de origen también se sobrescribe con estos datos y vuelve al
          estatus <strong>Autorizada</strong>.
        </p>

        {requiresFolioMatch ? (
          /* El folio a teclear va FUERA del campo, en su propio bloque y en
             mono. Antes vivía en la etiqueta ("ESCRIBE P-00033-2026 PARA
             CONFIRMAR") y además como `placeholder`, con dos efectos malos: la
             etiqueta lo pintaba en mayúsculas —el folio real puede no serlo— y
             el placeholder dentro del input se leía como si el campo ya
             estuviera lleno. */
          <div className="space-y-2">
            <p className="text-sm text-slate-700 dark:text-slate-200">
              Para continuar, escribe este folio:
            </p>
            <p className="select-all rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3 py-2 text-center font-mono text-base font-bold tracking-wide text-slate-900 dark:text-white">
              {folio}
            </p>
            <FormInput
              label="Folio del pedido"
              name="confirmacion-folio"
              value={typedFolio}
              onChange={(event) => setTypedFolio(event.target.value)}
              placeholder="Escribe el folio aquí"
              autoComplete="off"
              disabled={isPending}
              aria-describedby="confirmacion-folio-ayuda"
            />
            <p
              id="confirmacion-folio-ayuda"
              aria-live="polite"
              className={`text-[11px] ml-1 ${
                typedFolioTrimmed.length === 0
                  ? "text-slate-400"
                  : folioMatches
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-amber-600 dark:text-amber-400"
              }`}
            >
              {typedFolioTrimmed.length === 0
                ? "El folio debe coincidir exactamente."
                : folioMatches
                  ? "El folio coincide."
                  : "Todavía no coincide."}
            </p>
          </div>
        ) : (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Este pedido no tiene folio asignado, así que no hay nada que teclear.
            Revisa dos veces antes de continuar.
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            disabled={!folioMatches || isPending}
          >
            {isPending ? "Guardando..." : "Guardar y sincronizar"}
          </Button>
        </div>
      </div>
    </MainDialog>
  );
}
