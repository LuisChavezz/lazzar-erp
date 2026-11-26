"use client";

import { useServerTable } from "@/src/hooks/useServerTable";
import { pageNumberAdapter } from "@/src/utils/serverListAdapters";
import type { StockDigitalFila } from "../interfaces/digital-stock.interface";
import { getDigitalStockPage } from "../services/actions";
import { DIGITAL_STOCK_KEY, digitalStockTable } from "../constants/digitalStockTable";
import { digitalStockErrorMessage } from "../utils/digitalStockErrors";

// A nivel de módulo: una referencia estable entre renders.
const digitalStockAdapter = pageNumberAdapter<StockDigitalFila>();

/**
 * Stock digital por SKU en MODO SERVIDOR: filtros, búsqueda y página en la URL
 * (`useServerTable`), así que la página que lo monta lo envuelve en
 * `<Suspense>`. Consulta bajo `["stock-digital", "list", params]`, con todos los
 * filtros y la página en la llave. Un `?page=` que ya no existe (404 "Página
 * inválida.") lo trata el adaptador como "fuera de rango".
 */
export const useDigitalStockTable = () =>
  useServerTable({
    definition: digitalStockTable,
    queryKey: DIGITAL_STOCK_KEY,
    queryFn: getDigitalStockPage,
    adapter: digitalStockAdapter,
    toastId: "digital-stock-table-refetch-error",
    refetchErrorMessage:
      "No se pudo actualizar el stock digital. Se muestran los datos anteriores.",
    loadErrorMessage: "No se pudo cargar el stock digital.",
    errorMessageFor: digitalStockErrorMessage,
  });
