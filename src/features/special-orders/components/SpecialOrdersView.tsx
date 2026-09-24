"use client";

import { useRouter } from "next/navigation";
import { DataTable } from "@/src/components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { useSpecialOrders } from "../hooks/useSpecialOrders";
import { SPECIAL_ORDER_FILTER_CONFIG } from "../utils/specialOrderFilters";
import { getSpecialOrderColumns } from "./SpecialOrderColumns";

/**
 * Vista de "Pedidos especiales" (solo lectura): pedidos con al menos una línea
 * de muestra, para que Producción vea qué hay que fabricar fuera de catálogo.
 *
 * Mismo armazón que `CorteMangaOrdersView`: `DataTable` montada SIEMPRE (el
 * toolbar sigue visible durante la carga y el error), error de cuerpo solo en la
 * carga inicial, y "Ver detalle" que NAVEGA a
 * `/manufacturing/special-orders/[id]`. Sin KPIs ni exportación.
 *
 * El orden es el del servidor (sin confirmar primero) y no se reordena; los
 * chips de Clasificación y Estado solo filtran en memoria lo ya cargado.
 */
export function SpecialOrdersView() {
  const { orders, isLoading, isError, error, hasLoaded, refetch, isFetching } =
    useSpecialOrders();
  const router = useRouter();

  const showError = isInitialLoadError(isError, hasLoaded);
  const columns = getSpecialOrderColumns({
    onViewDetail: (id) => router.push(`/manufacturing/special-orders/${id}`),
  });

  return (
    <DataTable
      columns={columns}
      data={orders}
      getRowId={(row) => String(row.id)}
      searchPlaceholder="Buscar por folio o cliente..."
      filterConfig={SPECIAL_ORDER_FILTER_CONFIG}
      onRefetch={refetch}
      isRefetching={isFetching}
      emptyMessage="No hay pedidos especiales."
      isLoading={isLoading}
      isError={showError}
      errorTitle="Error al cargar los pedidos especiales"
      errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
      onErrorRetry={refetch}
      loadingAriaLabel="Cargando pedidos especiales"
    />
  );
}
