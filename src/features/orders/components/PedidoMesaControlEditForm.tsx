"use client";

import Link from "next/link";
import { QuoteFormContent } from "@/src/features/quotes/components/QuoteForm";
import { formatCurrency, formatMoneyValueOrDash } from "@/src/utils/formatCurrency";
import { usePedidoMesaControlEditForm } from "../hooks/usePedidoMesaControlEditForm";
import { PedidoMesaControlBloqueos } from "./PedidoMesaControlBloqueos";

interface PedidoMesaControlEditFormProps {
  pedidoId: number;
}

/**
 * Edición de un pedido por Mesa de Control.
 *
 * Delega TODA la lógica a `usePedidoMesaControlEditForm` y reutiliza
 * `QuoteFormContent` para el JSX — el mismo componente que pintan el alta y la
 * edición de cotizaciones. Sigue el molde de `QuoteEditForm`: el wrapper solo
 * separa las claves propias del flujo antes de hacer spread del contrato
 * compartido, y añade los estados terminales que `QuoteFormContent` no sabe
 * distinguir del "cargando".
 */
export function PedidoMesaControlEditForm({ pedidoId }: PedidoMesaControlEditFormProps) {
  const {
    pedido,
    pedidoLoadFailed,
    pedidoNotSyncable,
    pedidoAccountingHidden,
    pedidoNotRepresentable,
    pedidoNotEditableStatus,
    lineasNoRepresentables,
    mergeCollisions,
    isPedidoRetrying,
    retryPedidoLoad,
    contextoBloqueos,
    contextoError,
    serviciosExtrasBase,
    ...formProps
  } = usePedidoMesaControlEditForm(pedidoId);

  const salidas = (
    <>
      <Link
        href={`/orders/${pedidoId}?from=operations`}
        className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline"
      >
        Ver detalle del pedido
      </Link>
      <Link
        href="/operations/orders"
        className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:underline"
      >
        Volver a Mesa de Control
      </Link>
    </>
  );

  /* Documentos ligados: el pedido no es editable. Va PRIMERO entre los estados
   * terminales porque es el motivo más accionable — hay algo concreto que
   * cancelar — y porque un pedido puede cumplir varios a la vez: con una orden
   * de bordado activa y tallas dispares, enseñar la limitación del formulario
   * mandaba al usuario a investigar la pista equivocada.
   *
   * Cubre los dos momentos con el mismo componente porque el backend devuelve
   * el mismo cuerpo en ambos: el precheck al abrir, y el 409 si el bloqueo
   * aparece mientras se editaba. */
  if (contextoBloqueos) {
    return <PedidoMesaControlBloqueos contexto={contextoBloqueos}>{salidas}</PedidoMesaControlBloqueos>;
  }

  /* Fallo TÉCNICO al cargar el pedido (500, red, timeout — nunca 404/403, que
   * redirigen al listado desde el hook): estado terminal con reintento en vez
   * del loader infinito de QuoteFormContent, que no distingue "cargando" de "la
   * consulta ya falló". */
  if (pedidoLoadFailed) {
    return (
      <div className="w-full pt-2">
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-rose-200 dark:border-rose-500/20 bg-rose-50/50 dark:bg-rose-500/5 px-6 py-10 text-center"
        >
          <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
            No se pudo cargar el pedido.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Ocurrió un problema técnico al consultar el servidor. Intenta de nuevo.
          </p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => retryPedidoLoad()}
              disabled={isPedidoRetrying}
              className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isPedidoRetrying ? "Reintentando…" : "Reintentar"}
            </button>
            <Link
              href="/operations/orders"
              className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:underline"
            >
              Volver a Mesa de Control
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* Pedido SIN cotización de origen: el endpoint responde 400 porque su
   * contrato es editar-y-espejar. Se explica aquí en vez de redirigir en
   * silencio —el usuario llegó pulsando "Editar", merece saber por qué no se
   * puede— y en vez de dejar que reviente al guardar. */
  if (pedidoNotSyncable) {
    return (
      <div className="w-full pt-2">
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5 px-6 py-10 text-center"
        >
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
            Este pedido no se puede editar desde Mesa de Control.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
            No tiene una cotización de origen ligada, y esta edición siempre
            sincroniza los cambios con ella.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href={`/orders/${pedidoId}?from=operations`}
              className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline"
            >
              Ver detalle del pedido
            </Link>
            <Link
              href="/operations/orders"
              className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:underline"
            >
              Volver a Mesa de Control
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* La respuesta llegó SIN los campos contables (filtrada por rol). Hidratar con
   * ella pondría todos los precios en 0 y el guardado los escribiría así de
   * verdad. Se corta antes de montar el
   * formulario: es preferible no poder editar a destruir los importes. */
  if (pedidoAccountingHidden) {
    return (
      <div className="w-full pt-2">
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5 px-6 py-10 text-center"
        >
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
            Tu usuario no puede editar este pedido.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
            El servidor devolvió el pedido sin los importes (precios, totales y
            forma de pago) porque tu rol no tiene acceso contable. Guardar desde
            aquí los pondría en cero. Pide que se te asigne el rol contable
            correspondiente.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href={`/orders/${pedidoId}?from=operations`}
              className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline"
            >
              Ver detalle del pedido
            </Link>
            <Link
              href="/operations/orders"
              className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:underline"
            >
              Volver a Mesa de Control
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* Estatus no editable (CANCELADO, o un valor fuera del enum). Los dos
   * disparadores ya ocultan la acción; esto cubre la URL escrita a mano. */
  if (pedidoNotEditableStatus) {
    return (
      <div className="w-full pt-2">
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5 px-6 py-10 text-center"
        >
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
            Este pedido no se puede editar por su estatus.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
            Un pedido cancelado no admite cambios. No hay nada que corregir en
            un documento que ya se dio de baja.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href={`/orders/${pedidoId}?from=operations`}
              className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline"
            >
              Ver detalle del pedido
            </Link>
            <Link
              href="/operations/orders"
              className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:underline"
            >
              Volver a Mesa de Control
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* Servicios que varían POR TALLA dentro de una misma línea. Este formulario
   * los modela por LÍNEA (`QuoteItem` lleva `bordados`/`reflejantes`/
   * `lleva_corte_manga` sueltos y sus tallas solo `{tallaId, nombre, cantidad}`),
   * así que abrirlo aplanaría la variación al guardar. Se bloquea con el detalle
   * de qué líneas la tienen, en vez de destruirla en silencio. */
  if (pedidoNotRepresentable) {
    return (
      <div className="w-full pt-2">
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5 px-6 py-10 text-center"
        >
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
            Este pedido no se puede editar desde esta pantalla.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg">
            Tiene servicios (bordado, reflejante, corte de manga o cambio de talla)
            configurados <strong>de forma distinta en cada talla</strong> de una misma
            línea, y este formulario solo sabe capturarlos por línea completa.
            Guardar desde aquí igualaría todas las tallas y perdería esa
            configuración.
          </p>
          <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
            {lineasNoRepresentables.map((linea) => (
              <li key={linea.id}>
                •{" "}
                {linea.producto_nombre ||
                  linea.producto_nombre_externo ||
                  `Línea #${linea.id}`}
                {linea.color_nombre ? ` — ${linea.color_nombre}` : ""}
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-4">
            <Link
              href={`/orders/${pedidoId}?from=operations`}
              className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline"
            >
              Ver detalle del pedido
            </Link>
            <Link
              href="/operations/orders"
              className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:underline"
            >
              Volver a Mesa de Control
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* Los avisos comparan el estado del formulario contra lo guardado, así que
   * solo tienen sentido con el formulario YA hidratado. `usePedidoDetail`
   * resuelve antes que los catálogos y el precheck: en esa ventana `pedido`
   * existe pero el formulario sigue en `emptyValues`, `granTotal` vale 0 y el
   * aviso anunciaba "se guardará: $0.00" encima del spinner de carga. */
  const storedGranTotal = pedido ? Number(pedido.gran_total) : Number.NaN;
  const granTotalDiffers =
    formProps.showForm &&
    Number.isFinite(storedGranTotal) &&
    Math.abs(storedGranTotal - formProps.granTotal) >= 0.01;

  return (
    <div className="w-full space-y-4">
      {/* Avisos que antes vivían en el diálogo de confirmación. Se pintan
          INLINE, encima del formulario: sin diálogo hay que enseñarlos mientras
          se edita, no al final. Ninguno bloquea el guardado. */}
      {contextoError && (
        <p
          role="status"
          className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-2 text-[11px] text-slate-500 dark:text-slate-400"
        >
          No se pudo comprobar si el pedido tiene documentos ligados. Puedes
          intentar guardar: el servidor lo verifica otra vez y lo rechazaría.
        </p>
      )}

      {formProps.showForm && mergeCollisions.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50/60 dark:bg-amber-500/5 p-4 space-y-2">
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
            La cotización espejo va a fusionar partidas.
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            El pedido conserva sus renglones (se actualizan por id), pero la
            cotización de origen se reescribe desde cero y agrupa las partidas que
            coinciden en producto, color, dirección y tallas —{" "}
            <strong>sin mirar el precio</strong>. Pedido y cotización quedarán con
            distinto número de renglones:
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
                      ; en la cotización solo sobrevive el primero)
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {granTotalDiffers && pedido && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50/60 dark:bg-amber-500/5 p-4 space-y-1">
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
            El gran total va a cambiar al guardar.
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Guardado hoy:{" "}
            <span className="font-mono font-semibold">
              {formatMoneyValueOrDash(pedido.gran_total)}
            </span>{" "}
            → se guardará:{" "}
            <span className="font-mono font-semibold">
              {formatCurrency(formProps.granTotal)}
            </span>
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Suele deberse a servicios extra cuya cantidad no se copió al crear el
            pedido. Verifica el importe antes de guardar.
          </p>
        </div>
      )}

      <QuoteFormContent
        {...formProps}
        submitLabel="Guardar cambios del pedido"
        mode="edit-pedido"
        removalBlockedExtraServicesCount={serviciosExtrasBase}
        removalBlockedReason="Este pedido se edita en modo estricto: los renglones existentes se actualizan, no se pueden quitar. Para eliminarlos hay que cancelar antes los documentos ligados."
      />
    </div>
  );
}
