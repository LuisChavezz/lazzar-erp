"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { DataTable } from "@/src/components/DataTable";
import { ListTabs } from "@/src/components/ListTabs";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { canSeeProductionCosts, hasProductionPermission } from "@/src/utils/productionPermissions";
import { useSalidasMaquila } from "../hooks/useSalidasMaquila";
import { useSalidasMaquilaFilters } from "../hooks/useSalidasMaquilaFilters";
import { getSalidaMaquilaColumns } from "./SalidaMaquilaColumns";
import { SalidaMaquilaDetailDialog } from "./SalidaMaquilaDetailDialog";
import { SalidasMaquilaFilters } from "./SalidasMaquilaFilters";

type Vista = "maquila" | "recibidas" | "canceladas";

/**
 * Salidas a maquila (SM): lo que está con un maquilero, lo ya recibido y lo
 * cancelado. Las SM se generan desde el detalle de la OP.
 *
 * La OP y el maquilero filtran en el SERVIDOR (`?op=`, `?centro_confeccion=`,
 * en la URL); las pestañas reparten por estatus lo que el servidor devolvió.
 */
export function SalidasMaquilaView() {
  const { filters, setFilter, hasActiveFilters, clearFilters } = useSalidasMaquilaFilters();
  const { salidas, hasLoaded, isLoading, isFetching, isInitialError, error, refetch } = useSalidasMaquila(filters);
  const { data: session } = useSession();
  const canWrite = hasProductionPermission(session?.user, "OP", "C");
  const canSeeAmounts = canSeeProductionCosts(session?.user);
  const [vista, setVista] = useState<Vista>("maquila");
  const [openId, setOpenId] = useState<number | null>(null);

  const enMaquila = salidas.filter((s) => s.estatus === "ENVIADA");
  const recibidas = salidas.filter((s) => s.estatus === "RECIBIDA");
  const canceladas = salidas.filter((s) => s.estatus === "CANCELADA");
  const rows = vista === "maquila" ? enMaquila : vista === "recibidas" ? recibidas : canceladas;
  const columns = getSalidaMaquilaColumns(setOpenId, canSeeAmounts);

  return (
    <div className="space-y-6">
      <SalidasMaquilaFilters
        filters={filters}
        setFilter={setFilter}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
      />
      <ListTabs
        ariaLabel="Vista de salidas a maquila"
        value={vista}
        onChange={setVista}
        isReady={hasLoaded}
        tabs={[
          { key: "maquila", label: "En maquila", count: enMaquila.length },
          { key: "recibidas", label: "Recibidas", count: recibidas.length },
          { key: "canceladas", label: "Canceladas", count: canceladas.length },
        ]}
      />
      <DataTable
        columns={columns}
        data={rows}
        searchPlaceholder="Buscar folio, OP/OB o maquilero..."
        getRowId={(row) => String(row.id)}
        onRefetch={refetch}
        isRefetching={isFetching}
        emptyMessage={
          hasActiveFilters
            ? "No hay salidas con estos filtros en esta vista."
            : vista === "maquila"
            ? "No hay prendas en maquila. Genera una salida desde el detalle de la OP."
            : "No hay salidas en esta vista."
        }
        paginationResetKey={`${vista}|${filters.op ?? ""}|${filters.centro_confeccion ?? ""}`}
        isLoading={isLoading}
        isError={isInitialError}
        errorTitle="Error al cargar las salidas a maquila"
        errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
        onErrorRetry={refetch}
        loadingAriaLabel="Cargando salidas a maquila"
      />
      <SalidaMaquilaDetailDialog
        id={openId}
        onClose={() => setOpenId(null)}
        canWrite={canWrite}
        canSeeAmounts={canSeeAmounts}
      />
    </div>
  );
}
