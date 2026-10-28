"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowLeftIcon, ScissorsIcon, TrendingUpIcon } from "@/src/components/Icons";
import { Loader } from "@/src/components/Loader";
import { ErrorState } from "@/src/components/ErrorState";
import { StatusBadge } from "@/src/components/StatusBadge";
import { InfoField, InfoGrid, textOrDash } from "@/src/components/DetailDialogPrimitives";
import {
  OrderChip,
  SheetPanel,
  SheetSection,
} from "@/src/features/orders/components/OrderSheetPrimitives";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { hasPermission } from "@/src/utils/permissions";
import { parsePositiveId } from "@/src/utils/parsePositiveId";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { formatShortDate, formatShortTime } from "@/src/utils/formatDate";
import { pluralForQuantity } from "@/src/utils/plural";
import { EMBROIDERY_COVERAGE_CONFIG } from "../constants/embroideryStatus";
import { isTerminalStatus } from "../constants/embroideryStatusTransitions";
import { useEmbroideryOrderDetail } from "../hooks/useEmbroideryOrderDetail";
import { PedidoVinculadoFolio } from "@/src/features/orders/components/PedidoVinculadoFolio";
import { useUpdateEmbroideryOrder } from "../hooks/useUpdateEmbroideryOrder";
import { EmbroideryStatusSelect } from "./EmbroideryStatusSelect";
import { EmbroideryMachineField } from "./EmbroideryMachineField";
import { EmbroideryObservationsField } from "./EmbroideryObservationsField";
import { EmbroideryOperatorSelect } from "./EmbroideryOperatorSelect";
import { EmbroideryProveedorSelect } from "./EmbroideryProveedorSelect";
import { EmbroideryProgressSummary } from "./EmbroideryProgressSummary";
import { EmbroideryAvancesHistory } from "./EmbroideryAvancesHistory";
import type { EmbroideryOrderSibling } from "../interfaces/embroidery.interface";

// Destino del "Volver". Fijo —sin el mapa `?from=` de `PedidoDetailContent`—
// porque esta ruta NO es neutra: cuelga de `/manufacturing` y exige su código
// de sección, `R-PRODUCCION-OB` (el `R-PRODUCCION` del módulo no basta). Se llega desde
// su listado y desde la búsqueda global, y el backend solo manda el grupo de
// la búsqueda a quien tiene ese mismo `R-PRODUCCION-OB`: todo el que llega aquí puede
// abrir el listado, así que un mapa de orígenes no añadiría nada.
const BACK = {
  href: "/manufacturing/embroidery",
  label: "Volver a Órdenes de Bordado",
};

/**
 * Las otras OB activas del mismo pedido.
 *
 * A diferencia del diálogo —que las lista como texto plano porque no hay a
 * dónde navegar desde un modal sin cerrarlo—, aquí CADA hermana enlaza a su
 * propia página: es la misma ruta con otro id, así que el enlace no inventa
 * ninguna navegación que la página no soporte ya.
 */
const SiblingOrders = ({ items }: { items: EmbroideryOrderSibling[] }) => (
  <ul className="space-y-1 text-xs">
    {items.map((hermana) => (
      <li key={hermana.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
        <Link
          href={`/manufacturing/embroidery/${hermana.id}`}
          className="font-mono font-semibold text-sky-600 dark:text-sky-400 hover:underline hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
        >
          {hermana.folio_bordado}
        </Link>
        <span className="tabular-nums text-slate-500 dark:text-slate-400">
          {formatShortDate(hermana.fecha_inicio)} ·{" "}
          {formatShortTime(hermana.fecha_inicio)}
        </span>
      </li>
    ))}
  </ul>
);

// ── Componente principal ─────────────────────────────────────────────────────

interface EmbroideryOrderDetailContentProps {
  /** Id de la orden tal cual llega del segmento de ruta (string). */
  orderId: string;
}

export function EmbroideryOrderDetailContent({
  orderId,
}: EmbroideryOrderDetailContentProps) {
  // Solo dígitos: `Number()` aceptaría "1.5" o "1e2" (que resolvería a la OB
  // 100). Con `null` la consulta queda apagada y abajo se pinta "Orden no
  // válida" sin pedir nada.
  const numericId = parsePositiveId(orderId);
  const { data, isNotFound, isInitialError, error } = useEmbroideryOrderDetail(numericId);
  // Mutación de edición de la ficha (estatus + máquina). El hook invalida el
  // detalle en `onSuccess`, así que el re-fetch refleja el nuevo estado; solo
  // se dispara desde los controles editables de abajo, nunca en los estados de
  // carga/error (que retornan antes de renderizarlos).
  const updateOrder = useUpdateEmbroideryOrder(numericId ?? 0);

  // Permiso de edición de la ficha. Se resuelve AQUÍ y no más abajo junto a
  // `isTerminal` porque `useSession` es un hook: los estados de carga/error
  // retornan antes y no puede quedar tras un `return` condicional.
  // `hasPermission` ya cortocircuita para el rol "admin".
  const { data: session } = useSession();
  const canEditOb = hasPermission("E-PRODUCCION-OB", session?.user);

  const BackLink = (
    <Link
      href={BACK.href}
      className="inline-flex items-center gap-2 text-slate-500 hover:text-sky-500 transition-colors px-4 py-2 rounded-full bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"
    >
      <ArrowLeftIcon className="w-4 h-4" />
      <span className="text-sm font-medium">{BACK.label}</span>
    </Link>
  );

  // Los tres estados de fallo repiten el "Volver": sin él la página quedaría
  // sin salida salvo por el botón atrás del navegador.
  if (numericId === null) {
    return (
      <div className="w-full space-y-6">
        <div>{BackLink}</div>
        <ErrorState
          title="Orden no válida"
          message="El identificador de la orden de bordado no es válido."
        />
      </div>
    );
  }

  // Un 404 es DEFINITIVO aunque antes hubiera datos: el backend lo responde
  // tanto para un id inexistente como para uno ajeno (su `get_queryset()`
  // acotado por tenant no distingue los dos casos, por eso no hay 403).
  if (isNotFound) {
    return (
      <div className="w-full space-y-6">
        <div>{BackLink}</div>
        <ErrorState
          title="Orden de bordado no disponible"
          message="La orden no existe o no tienes acceso a ella."
        />
      </div>
    );
  }

  if (isInitialError) {
    return (
      <div className="w-full space-y-6">
        <div>{BackLink}</div>
        <ErrorState
          title="No se pudo cargar la orden de bordado"
          message={extractErrorMessage(
            error,
            "Ocurrió un problema al consultar el servidor. Intenta de nuevo.",
          )}
        />
      </div>
    );
  }

  // Sin datos ni error: carga inicial en curso (id válido ⇒ consulta activa).
  if (!data) {
    return (
      <div className="w-full space-y-6">
        <div>{BackLink}</div>
        <Loader
          title="Cargando orden de bordado"
          message="Obteniendo el detalle de la orden..."
        />
      </div>
    );
  }

  // Solo para mostrar: `cantidad_contratada` puede ser 0 (pedido sin líneas de
  // bordado vivas) y dividir daría "∞%".
  const porcentaje =
    data.cantidad_contratada > 0
      ? Math.round((data.cantidad_cubierta / data.cantidad_contratada) * 100)
      : null;

  // Estatus terminal (7 Finalizado / 8 Cancelado legacy): la ficha entera pasa
  // a solo lectura y no se registran avances. Se pregunta a `isTerminalStatus`
  // en vez de codificar los códigos a mano: es la MISMA función de la que
  // `getAvailableTransitions` deriva su lista vacía, así que el selector y el
  // resto del formulario no pueden discrepar.
  const isTerminal = isTerminalStatus(data.estatus_bordado);

  // Los controles editables degradan a su lectura simple por DOS motivos
  // independientes: la orden está cerrada, o quien la mira no tiene
  // `E-PRODUCCION-OB`. Se combinan en una sola bandera para que ningún campo
  // pueda quedar editable por olvidar una de las dos condiciones.
  const isReadOnly = isTerminal || !canEditOb;

  // Mismo lenguaje visual que el detalle del pedido y el de OP ("hoja
  // impresa"): barra fija con "Volver" y secciones blancas con paneles grises.
  return (
    <div className="w-full space-y-6">
      {/* ── Barra superior fija con "Volver" ─────────────────────────────── */}
      <div className="sticky top-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 dark:border-white/5 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md shadow-sm dark:shadow-none px-6 md:px-8 py-3">
        {BackLink}
        {isTerminal && <OrderChip>Orden cerrada · solo lectura</OrderChip>}
      </div>

      {/* ── 1. La orden ─────────────────────────────────────────────────── */}
      <SheetSection
        icon={<ScissorsIcon className="w-5 h-5" />}
        title="Orden de Bordado"
        subtitle="Datos de la orden, su origen y quién la trabaja."
        badges={
          <>
            <StatusBadge
              status={String(data.cobertura_completa)}
              config={EMBROIDERY_COVERAGE_CONFIG}
            />
            {/* `cantidad_cubierta` y NO la suma cruda de `detalles[].cantidad`:
                el backend la publica con PISO deliberado para no sobre-reportar
                cobertura, y es la cifra que ve el resto del módulo. */}
            <OrderChip>
              {formatQuantityValue(data.cantidad_cubierta)}{" "}
              {pluralForQuantity(data.cantidad_cubierta, "pieza", "piezas")}
            </OrderChip>
          </>
        }
      >
        <div className="flex flex-col xl:flex-row gap-6">
          <SheetPanel title="Orden" className="shrink-0 w-full xl:w-80">
            {/* El folio es el único <h1> de la página. */}
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white font-mono mb-6 break-all">
              {data.folio_bordado || `Orden #${data.id}`}
            </h1>
            <div className="space-y-4 text-xs">
              <InfoField label="Estatus">
                <EmbroideryStatusSelect
                  currentStatus={data.estatus_bordado}
                  statusDisplay={data.estatus_bordado_display}
                  onStatusChange={(next) => updateOrder.mutate({ estatus_bordado: next })}
                  isPending={updateOrder.isPending}
                  // El caso terminal lo resuelve el propio selector (se queda
                  // sin transiciones); aquí solo se le añade el de permisos.
                  readOnly={!canEditOb}
                />
              </InfoField>
              <InfoField label="Alta">{formatShortDate(data.fecha_inicio)}</InfoField>
              {/* `fecha_fin` es SIEMPRE `null` hoy (ningún endpoint la fija). */}
              <InfoField label="Fin">{formatShortDate(data.fecha_fin)}</InfoField>
              {/* Máquina, observaciones, operador y proveedor degradan a su
                  lectura simple con `isReadOnly`: estatus terminal o falta de
                  `E-PRODUCCION-OB`. */}
              <InfoField label="Máquina asignada">
                {isReadOnly ? (
                  textOrDash(data.maquina_asignada)
                ) : (
                  <EmbroideryMachineField
                    value={data.maquina_asignada}
                    onSave={(maquina) => updateOrder.mutateAsync({ maquina_asignada: maquina })}
                    isPending={updateOrder.isPending}
                  />
                )}
              </InfoField>
            </div>
          </SheetPanel>

          {/* Empresa / sucursal / operador / proveedor con el NOMBRE ya resuelto
              que manda el backend. Empresa y sucursal no se editan nunca; el
              operador y el proveedor sí, salvo en solo lectura. */}
          <SheetPanel title="Origen y seguimiento" className="flex-1 self-start w-full">
            <InfoGrid>
              <InfoField label="Pedido">
                <PedidoVinculadoFolio
                  pedidoVinculado={data.pedido_vinculado}
                  pedidoFolio={data.pedido_folio}
                  from="embroidery"
                />
              </InfoField>
              <InfoField label="Operador asignado">
                {isReadOnly ? (
                  textOrDash(data.usuario_nombre)
                ) : (
                  <EmbroideryOperatorSelect
                    usuarioNombre={data.usuario_nombre}
                    onOperatorChange={(usuarioId) =>
                      updateOrder.mutate({ usuario_asignado: usuarioId })
                    }
                    isPending={updateOrder.isPending}
                  />
                )}
              </InfoField>
              {/* Proveedor: dónde se borda. Sin proveedor NO es un dato que
                  falte —se borda en casa—, así que se rotula "Bordado interno". */}
              <InfoField label="Proveedor">
                {isReadOnly ? (
                  (data.proveedor_nombre?.trim() ?? "") || (
                    <span className="text-slate-500 dark:text-slate-400">Bordado interno</span>
                  )
                ) : (
                  <EmbroideryProveedorSelect
                    proveedorNombre={data.proveedor_nombre}
                    proveedorId={data.proveedor}
                    onProveedorChange={(proveedorId) =>
                      updateOrder.mutate({ proveedor: proveedorId })
                    }
                    isPending={updateOrder.isPending}
                  />
                )}
              </InfoField>
              <InfoField label="Empresa">{textOrDash(data.empresa_nombre)}</InfoField>
              <InfoField label="Sucursal">{textOrDash(data.sucursal_nombre)}</InfoField>
              <InfoField label="Observaciones" className="col-span-2 md:col-span-3">
                {isReadOnly ? (
                  textOrDash(data.observaciones)
                ) : (
                  <EmbroideryObservationsField
                    value={data.observaciones}
                    onSave={(observaciones) => updateOrder.mutateAsync({ observaciones })}
                    isPending={updateOrder.isPending}
                  />
                )}
              </InfoField>
            </InfoGrid>
          </SheetPanel>
        </div>
      </SheetSection>

      {/* ── 2. Cobertura del pedido ──────────────────────────────────────── */}
      <SheetSection
        icon={<TrendingUpIcon className="w-5 h-5" />}
        title="Cobertura del pedido"
        subtitle="Cuánto de lo contratado por el pedido programa esta orden."
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SheetPanel className="lg:col-span-2 p-5!">
            <div className="flex flex-wrap items-baseline justify-between gap-3 mb-3">
              <p className="text-sm text-slate-600 dark:text-slate-300 tabular-nums">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  {formatQuantityValue(data.cantidad_cubierta)}
                </span>{" "}
                de {formatQuantityValue(data.cantidad_contratada)}{" "}
                {pluralForQuantity(data.cantidad_contratada, "pieza contratada", "piezas contratadas")}
              </p>
              {porcentaje !== null && (
                <span
                  className={`text-lg font-bold tabular-nums ${
                    data.cobertura_completa
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {porcentaje}%
                </span>
              )}
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  data.cobertura_completa ? "bg-emerald-500" : "bg-amber-500"
                }`}
                style={{ width: `${Math.min(100, porcentaje ?? 0)}%` }}
              />
            </div>
            {!data.cobertura_completa && (
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                El resto puede programarse en otras órdenes de bordado.
              </p>
            )}
          </SheetPanel>

          {/* Otras OB del mismo pedido: cada una enlaza a su propia página. */}
          <SheetPanel
            title={`Otras órdenes del pedido (${data.otras_ordenes_del_pedido.length})`}
            className="p-5!"
          >
            {data.otras_ordenes_del_pedido.length > 0 ? (
              <SiblingOrders items={data.otras_ordenes_del_pedido} />
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Es la única orden de bordado de este pedido.
              </p>
            )}
          </SheetPanel>
        </div>
      </SheetSection>

      {/* ── 4. Resumen de avance ────────────────────────────────────────── */}
      <EmbroideryProgressSummary resumenAvance={data.resumen_avance} />

      {/* ── 5. Historial de avances ─────────────────────────────────────── */}
      <EmbroideryAvancesHistory
        avances={data.avances}
        obId={data.id}
        isTerminal={isTerminal}
        programado={data.resumen_avance.cantidad_programada}
        bordado={data.resumen_avance.cantidad_bordada_total}
      />
    </div>
  );
}
