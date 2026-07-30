"use client";

import { useMemo, useState } from "react";
import { DataTable, type DataTableFilterConfig } from "@/src/components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { MOCK_ALMACENES } from "../constants/rfidMatchCatalogs";
import { RFID_MATCH_STATUS_CONFIG } from "../constants/rfidMatchStatus";
import { useRfidMatches } from "../hooks/useRfidMatches";
import { getRfidMatchColumns } from "./RfidMatchColumns";
import { RfidMatchDetailDialog } from "./RfidMatchDetailDialog";
import { RfidMatchForm } from "./RfidMatchForm";
import { RfidMatchStats } from "./RfidMatchStats";

// Opciones derivadas de los MISMOS catálogos que pintan el badge y alimentan
// el alta, para que un estatus o un almacén no puedan existir en la tabla sin
// existir en el filtro. `DataTable` compara `String(fila[id]) === value`, así
// que los `value` son los strings exactos del registro (no el id del almacén,
// que el renglón no guarda: guarda el NOMBRE).
const ESTADO_FILTER_OPTIONS = Object.entries(RFID_MATCH_STATUS_CONFIG).map(([value, cfg]) => ({
  value,
  label: cfg.label ?? value,
}));

const ALMACEN_FILTER_OPTIONS = MOCK_ALMACENES.map((almacen) => ({
  value: almacen.nombre,
  label: almacen.nombre,
}));

const FILTER_CONFIG: DataTableFilterConfig[] = [
  { id: "estado", label: "Estatus", options: ESTADO_FILTER_OPTIONS },
  { id: "almacen", label: "Almacén", options: ALMACEN_FILTER_OPTIONS },
];

/**
 * Vista de Encuadres RFID: KPIs del listado (`RfidMatchStats`) más el listado
 * propio, con el alta (`RfidMatchForm`) en el toolbar y "Ver Detalles" por
 * renglón (la simulación de escaneo, ver `RfidMatchDetailDialog`).
 *
 * `DataTable` se monta SIEMPRE y recibe `isLoading`/`isError` en vez de
 * sustituirse por un skeleton/`ErrorState` en un ternario propio, para que el
 * toolbar —y con él "Nuevo encuadre"— siga visible durante la carga y el
 * error. Mismo patrón que `PickingView`/`LabelsView`. Aquí la carga es
 * instantánea (los registros viven en memoria, ver `mocks/rfid-matches.mock.ts`),
 * pero el cableado se conserva para que cambiar el `queryFn` de
 * `useRfidMatches` por un endpoint real no obligue a tocar esta vista.
 *
 * El diálogo de detalle se monta AQUÍ —fuera de `DataTable`— y no dentro de la
 * fila que lo abrió (ver `getRfidMatchColumns`): como puede MUTAR el `estado`
 * del propio registro ("Marcar aceptado en QA"), montarlo dentro de la fila
 * lo desmontaría a mitad de la interacción en cuanto esa mutación sacara la
 * fila del conjunto filtrado (p. ej. con el filtro "Estatus: Pendiente"
 * activo). Aquí, en cambio, sobrevive a cualquier filtrado de la tabla; solo
 * se desmonta cuando el propio operador lo cierra.
 */
export function RfidMatchesView() {
  const { matches, isLoading, isError, error, hasLoaded, refetch, isFetching } =
    useRfidMatches();
  const [openMatchId, setOpenMatchId] = useState<number | null>(null);

  const showError = isInitialLoadError(isError, hasLoaded);
  const columns = useMemo(() => getRfidMatchColumns(setOpenMatchId), []);

  return (
    <div className="space-y-6">
      {/* KPIs ocultos durante la carga INICIAL y ante un error de carga: no hay
          datos que resumir y `matches` arranca en `[]`, así que sin el gate
          las tarjetas mostrarían ceros que se leerían como datos reales. */}
      {!isLoading && !showError && <RfidMatchStats items={matches} />}

      <DataTable
        columns={columns}
        data={matches}
        searchPlaceholder="Buscar encuadre, orden de compra, proveedor o almacén..."
        filterConfig={FILTER_CONFIG}
        getRowId={(row) => String(row.id)}
        onRefetch={refetch}
        isRefetching={isFetching}
        emptyMessage="No hay encuadres registrados."
        actionButton={<RfidMatchForm />}
        // `matches.length` solo cambia cuando `RfidMatchForm` CREA un
        // registro (las mutaciones de escaneo/aceptación editan un renglón
        // existente sin alterar el conteo) — así que esto reinicia la
        // paginación a la página 1 justo cuando aparece un renglón nuevo, sin
        // reiniciarla en cada lectura registrada dentro del diálogo. El nuevo
        // encuadre se antepone (`createRfidMatch` hace `unshift`), así que la
        // página 1 es donde queda visible.
        paginationResetKey={matches.length}
        isLoading={isLoading}
        isError={showError}
        errorTitle="Error al cargar los encuadres"
        errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
        loadingAriaLabel="Cargando encuadres"
      />

      {openMatchId !== null && (
        <RfidMatchDetailDialog
          matchId={openMatchId}
          open={true}
          onOpenChange={(open) => {
            if (!open) setOpenMatchId(null);
          }}
        />
      )}
    </div>
  );
}
