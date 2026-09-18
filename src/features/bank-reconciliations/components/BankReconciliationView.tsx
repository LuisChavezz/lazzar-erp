"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DataTable } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { useBankAccounts } from "@/src/features/bank-accounts/hooks/useBankAccounts";
import { formatSaldo } from "@/src/features/bank-accounts/utils/bankAccountMoney";
import { CONCILIACION_ESTATUS_FILTER } from "../constants/conciliacionEstatus";
import {
  CONCILIACION_DESCUADRADA_MESSAGE,
  centavosAMoneda,
  conciliacionCuadra,
  diferenciaEnCentavos,
} from "../schemas/bank-reconciliation.schema";
import type {
  ConciliacionBancaria,
  ConciliacionEnDetalle,
  PrepararConciliacionResponse,
} from "../interfaces/bank-reconciliation.interface";
import {
  conciliacionEnDetalleDesdePreparar,
  llaveDeFiltro,
} from "../utils/conciliacionEnDetalle";
import { useConciliaciones } from "../hooks/useConciliaciones";
import { useCerrarConciliacion } from "../hooks/useCerrarConciliacion";
import { useCancelarConciliacion } from "../hooks/useCancelarConciliacion";
import { getColumns } from "./BankReconciliationColumns";
import { BankReconciliationDetailDialog } from "./BankReconciliationDetailDialog";
import PrepararConciliacionForm from "./PrepararConciliacionForm";

/**
 * Vista de conciliaciones bancarias.
 *
 * ─── LOS FILTROS VIVEN FUERA DE `DataTable` ──────────────────────────────────
 *
 * Cuenta y periodo van al SERVIDOR, no al `filterConfig` de la tabla: el
 * backend resuelve el SOLAPAMIENTO de rangos —devuelve las conciliaciones cuyo
 * periodo se cruza con el pedido—, y `DataTable` solo sabe comparar el valor de
 * una columna contra un literal. El filtro de estatus sí se queda en la tabla,
 * en memoria, porque es una comparación directa.
 *
 * La URL es la fuente de verdad (`?cuenta=&desde=&hasta=`), igual que el filtro
 * de almacén de `StockView`: el enlace es compartible, sobrevive al refresh y
 * al botón de atrás.
 */
export function BankReconciliationView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const cuentaParam = searchParams.get("cuenta");
  const parsedCuenta = cuentaParam ? Number(cuentaParam) : NaN;
  const cuentaId =
    Number.isInteger(parsedCuenta) && parsedCuenta > 0 ? parsedCuenta : null;
  const desde = searchParams.get("desde") ?? "";
  const hasta = searchParams.get("hasta") ?? "";

  const { bankAccounts, hasLoaded: hasLoadedAccounts } = useBankAccounts();
  const activeAccounts = bankAccounts.filter((cuenta) => cuenta.activo);

  // La moneda es POR CUENTA: formatear con el MXN por defecto mentiría sobre
  // una cuenta en dólares. La fila solo trae el id, así que se resuelve aquí.
  const monedaDe = (cuentaBancariaId: number): string | null =>
    bankAccounts.find((cuenta) => cuenta.id === cuentaBancariaId)?.moneda_codigo ??
    null;

  // Solo se consulta con cuenta Y periodo completos: sin ellos la petición
  // traería todas las conciliaciones de la empresa, que no es lo que esta
  // pantalla quiere mostrar.
  const filtrosListos = cuentaId !== null && desde !== "" && hasta !== "" && desde <= hasta;
  const params = filtrosListos
    ? { cuenta_bancaria: cuentaId, fecha_inicio: desde, fecha_fin: hasta }
    : undefined;

  const {
    conciliaciones,
    hasLoaded,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
    isPlaceholderData,
  } = useConciliaciones(params, { enabled: filtrosListos });

  // Cambio de filtro en curso: `keepPreviousData` sigue mostrando lo anterior
  // mientras llega lo nuevo. Distinto de `isLoading`, que solo es cierto en la
  // primera carga.
  const isSwitchingFilters = isFetching && isPlaceholderData;

  // Cambiar un filtro es ajustar la vista, no navegar: `replace` para no
  // ensuciar el historial.
  const setFilter = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(patch).forEach(([key, value]) => {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    });
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // ── Diálogos: su estado vive AQUÍ, nunca en la celda ─────────────────────
  // Una celda se desmonta al ordenar, filtrar o paginar, y cerrar o cancelar
  // cambia el `estatus`, que es justo uno de los filtros de la tabla.
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [openDetailId, setOpenDetailId] = useState<number | null>(null);
  const [cerrarTargetId, setCerrarTargetId] = useState<number | null>(null);
  const [cancelarTargetId, setCancelarTargetId] = useState<number | null>(null);

  const { mutate: cerrar } = useCerrarConciliacion();
  const { mutate: cancelar } = useCancelarConciliacion();

  const showError = isInitialLoadError(isError, hasLoaded);

  // Sin `useCallback`/`useMemo`: el React Compiler memoiza el componente.
  const handleViewDetail = (conciliacion: ConciliacionBancaria) =>
    setOpenDetailId(conciliacion.id);
  const handleCerrar = (conciliacion: ConciliacionBancaria) =>
    setCerrarTargetId(conciliacion.id);
  const handleCancelar = (conciliacion: ConciliacionBancaria) =>
    setCancelarTargetId(conciliacion.id);

  const columns = getColumns(handleViewDetail, handleCerrar, handleCancelar, monedaDe);

  const findById = (id: number | null) =>
    id !== null ? conciliaciones.find((c) => c.id === id) ?? null : null;

  // ── Detalle "fijado" ─────────────────────────────────────────────────────
  // Al preparar —o al abrir la conciliación cerrada que ofrece la tarjeta de
  // conflicto— la vista cambia de filtro Y abre el detalle en el mismo gesto.
  // El filtro vive en la URL y `router.replace` se aplica de forma ASÍNCRONA:
  // durante ese intervalo el listado sigue siendo el del filtro ANTERIOR, ya
  // asentado, y ahí la fila buscada no está. Resolver el detalle solo contra el
  // listado hacía que la limpieza del id colgado lo cerrara antes de abrirse.
  //
  // Por eso esos dos caminos FIJAN el objeto que ya tienen en mano, junto con el
  // filtro al que pertenece. El detalle lo usa hasta que la fila llega al
  // listado (y entonces manda la fila, que es la fuente de verdad) o hasta que
  // el listado se asienta sobre ESE filtro sin ella (y entonces el objeto quedó
  // obsoleto y se suelta).
  const [pinnedDetail, setPinnedDetail] = useState<{
    conciliacion: ConciliacionEnDetalle;
    filtroKey: string;
  } | null>(null);

  const filtroActualKey = filtrosListos
    ? llaveDeFiltro(cuentaId, desde, hasta)
    : null;
  // "Asentada" = sin petición en vuelo, con datos, y que esos datos sean los del
  // filtro ACTUAL (no el `placeholderData` del anterior mientras llega el nuevo).
  const listaAsentada = !isFetching && hasLoaded && !isPlaceholderData;

  const pinnedRow = pinnedDetail ? findById(pinnedDetail.conciliacion.id) : null;
  // Ajustes en RENDER, no en un efecto (`react-hooks/set-state-in-effect`).
  if (
    pinnedDetail !== null &&
    (pinnedRow !== null ||
      (listaAsentada && filtroActualKey === pinnedDetail.filtroKey))
  ) {
    setPinnedDetail(null);
  }

  const detailConciliacion: ConciliacionEnDetalle | null =
    findById(openDetailId) ??
    (pinnedDetail !== null && pinnedDetail.conciliacion.id === openDetailId
      ? pinnedDetail.conciliacion
      : null);
  const cerrarConciliacionTarget = findById(cerrarTargetId);
  const cancelarConciliacionTarget = findById(cancelarTargetId);

  // Si la fila desaparece del payload, el id no puede quedar colgado: un
  // refetch posterior reabriría el diálogo solo. Es el caso LEGÍTIMO —p. ej. la
  // conciliación se eliminó en el servidor mientras su detalle estaba abierto—.
  // Solo se aplica con la lista ASENTADA; el detalle fijado de arriba cubre el
  // intervalo en que el filtro todavía está cambiando.
  if (listaAsentada) {
    if (openDetailId !== null && detailConciliacion === null) setOpenDetailId(null);
    if (cerrarTargetId !== null && cerrarConciliacionTarget === null)
      setCerrarTargetId(null);
    if (cancelarTargetId !== null && cancelarConciliacionTarget === null)
      setCancelarTargetId(null);
  }

  /**
   * Apunta la vista al periodo de `conciliacion` y abre su detalle desde el
   * objeto que ya se tiene, sin esperar a que el listado cambie de filtro.
   */
  const openPinnedDetail = (conciliacion: ConciliacionEnDetalle) => {
    setFilter({
      cuenta: String(conciliacion.cuenta_bancaria),
      desde: conciliacion.fecha_inicio,
      hasta: conciliacion.fecha_final,
    });
    setIsFormOpen(false);
    setPinnedDetail({
      conciliacion,
      filtroKey: llaveDeFiltro(
        conciliacion.cuenta_bancaria,
        conciliacion.fecha_inicio,
        conciliacion.fecha_final,
      ),
    });
    setOpenDetailId(conciliacion.id);
  };

  /** Tras preparar: se aterriza en el detalle del borrador preparado. */
  const handlePrepared = (resultado: PrepararConciliacionResponse) =>
    openPinnedDetail(conciliacionEnDetalleDesdePreparar(resultado));

  return (
    <>
      {/* Filtros de SERVIDOR, fuera de la tabla. */}
      <section className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-white/5 p-5">
        <div className="md:col-span-2">
          <FormSelect
            label="Cuenta bancaria"
            name="cuenta"
            value={cuentaId === null ? "0" : String(cuentaId)}
            onChange={(event) =>
              setFilter({
                cuenta: event.target.value === "0" ? null : event.target.value,
              })
            }
          >
            <option value="0">Seleccionar cuenta...</option>
            {activeAccounts.map((cuenta) => (
              <option
                key={cuenta.id}
                value={cuenta.id}
                className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
              >
                {[cuenta.alias, cuenta.banco_nombre, cuenta.moneda_codigo]
                  .filter(Boolean)
                  .join(" · ")}
              </option>
            ))}
          </FormSelect>
        </div>
        <FormInput
          label="Desde"
          type="date"
          name="desde"
          value={desde}
          onChange={(event) => setFilter({ desde: event.target.value })}
        />
        <FormInput
          label="Hasta"
          type="date"
          name="hasta"
          value={hasta}
          onChange={(event) => setFilter({ hasta: event.target.value })}
        />
      </section>

      <DataTable
        columns={columns}
        data={conciliaciones}
        baseDataCount={conciliaciones.length}
        title="Conciliaciones Bancarias"
        searchPlaceholder="Buscar por cuenta o periodo..."
        // Solo el estatus se filtra en memoria; cuenta y periodo van al
        // servidor (ver el encabezado de este archivo).
        filterConfig={[
          { id: "estatus", label: "Estatus", options: CONCILIACION_ESTATUS_FILTER },
        ]}
        onRefetch={refetch}
        isRefetching={isFetching}
        emptyMessage={
          filtrosListos
            ? "No hay conciliaciones para esta cuenta y periodo."
            : "Selecciona una cuenta bancaria y un periodo para ver sus conciliaciones."
        }
        isLoading={isLoading || isSwitchingFilters}
        isError={showError}
        errorTitle="Error al cargar las conciliaciones"
        errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
        onErrorRetry={refetch}
        loadingAriaLabel="Cargando las conciliaciones bancarias"
        getRowId={(row) => String(row.id)}
        // Cambiar de cuenta o de periodo vuelve a la página 1 sin perder orden,
        // búsqueda ni columnas.
        paginationResetKey={`${cuentaId ?? ""}-${desde}-${hasta}-${conciliaciones.length}`}
        actionButton={
          <MainDialog
            title={
              <DialogHeader
                title="Preparar Conciliación"
                subtitle="Cuenta, periodo y saldo del estado de cuenta"
                statusColor="indigo"
              />
            }
            open={isFormOpen}
            onOpenChange={setIsFormOpen}
            maxWidth="760px"
            trigger={
              <Button
                variant="primary"
                rounded="full"
                onClick={() => setIsFormOpen(true)}
                className="hover:scale-105 active:scale-95"
              >
                + Preparar conciliación
              </Button>
            }
          >
            {/* Se remonta al reabrir: los valores iniciales se leen de cero sin
                un `form.reset` en efecto. */}
            {isFormOpen && (
              <PrepararConciliacionForm
                onPrepared={handlePrepared}
                // La conciliación cerrada ya viene completa de la consulta de
                // solapamiento: se fija ese objeto en vez de ir a buscar la fila
                // a un listado que todavía muestra otro periodo.
                onOpenExisting={openPinnedDetail}
                onCancel={() => setIsFormOpen(false)}
              />
            )}
          </MainDialog>
        }
      />

      {detailConciliacion && (
        <BankReconciliationDetailDialog
          conciliacion={detailConciliacion}
          monedaCodigo={monedaDe(detailConciliacion.cuenta_bancaria)}
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              setOpenDetailId(null);
              // Cerrar el diálogo suelta también el objeto fijado: ya no hay
              // nada que sostener, y así no queda una copia vieja esperando a
              // pintarse si el usuario reabre ese mismo detalle más tarde.
              setPinnedDetail(null);
            }
          }}
        />
      )}

      {cerrarConciliacionTarget && (
        <ConfirmDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setCerrarTargetId(null);
          }}
          title="Cerrar Conciliación"
          description={
            conciliacionCuadra(
              cerrarConciliacionTarget.saldo_estado_cuenta,
              cerrarConciliacionTarget.saldo_libros,
            )
              ? `¿Deseas cerrar la conciliación de ${
                  cerrarConciliacionTarget.cuenta_bancaria_alias ??
                  `#${cerrarConciliacionTarget.cuenta_bancaria}`
                }? Los movimientos del periodo quedarán marcados como Conciliado y la conciliación ya no admitirá cambios.`
              : `${CONCILIACION_DESCUADRADA_MESSAGE} Diferencia actual: ${formatSaldo(
                  centavosAMoneda(
                    diferenciaEnCentavos(
                      cerrarConciliacionTarget.saldo_estado_cuenta,
                      cerrarConciliacionTarget.saldo_libros,
                    ),
                  ),
                  monedaDe(cerrarConciliacionTarget.cuenta_bancaria),
                )}.`
          }
          confirmText="Cerrar conciliación"
          cancelText="Volver"
          onConfirm={() => {
            cerrar(cerrarConciliacionTarget.id);
            setCerrarTargetId(null);
          }}
          // `ConfirmDialog` usa la paleta de Radix: "green", no "emerald".
          confirmColor="green"
        />
      )}

      {cancelarConciliacionTarget && (
        <ConfirmDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setCancelarTargetId(null);
          }}
          title="Cancelar Conciliación"
          description={`¿Deseas cancelar la conciliación de ${
            cancelarConciliacionTarget.cuenta_bancaria_alias ??
            `#${cancelarConciliacionTarget.cuenta_bancaria}`
          }? Se conserva en el listado con estatus Cancelada y el periodo queda libre para volver a prepararse.`}
          confirmText="Cancelar conciliación"
          cancelText="Volver"
          onConfirm={() => {
            cancelar(cancelarConciliacionTarget.id);
            setCancelarTargetId(null);
          }}
          confirmColor="amber"
        />
      )}

      {/* El catálogo de cuentas alimenta el selector y la moneda de cada
          importe; si no cargó, se avisa en vez de mostrar saldos con la moneda
          equivocada. */}
      {hasLoadedAccounts && activeAccounts.length === 0 && (
        <p className="mt-4 text-xs text-amber-600 dark:text-amber-400">
          No hay cuentas bancarias activas: registra una antes de conciliar.
        </p>
      )}
    </>
  );
}
