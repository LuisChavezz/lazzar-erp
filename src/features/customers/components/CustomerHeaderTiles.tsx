"use client";

import { InfoTile, InfoTileGrid, textOrDash } from "@/src/components/DetailDialogPrimitives";
import { LoadingSkeleton } from "@/src/components/LoadingSkeleton";
import { plural } from "@/src/utils/kpiFormat";
import { useSatInfo } from "../../sat/hooks/useSatInfo";
import type { Customer } from "../interfaces/customer.interface";
import { formatCustomerUbicacion, satCatalogLabel } from "../utils/customerHeader";

/**
 * Mosaicos de encabezado del detalle del cliente (mismo molde que
 * `EmployeeDetailContent`). Solo campos que trae también la fila del listado,
 * así que se pintan igual mientras el detalle real llega (placeholder) que
 * después. Régimen fiscal y uso de CFDI se rotulan con el catálogo SAT
 * (`useSatInfo`: la misma llave y el mismo `staleTime` de 24 h que el
 * formulario de cliente, así que suele estar en caché). El cliente solo trae el
 * id interno de cada uno (ni código ni descripción), así que mientras el
 * catálogo llega el mosaico muestra un skeleton y no un "—" que pasaría por
 * dato vacío; "—" queda para un id que el catálogo no tiene (o si no cargó).
 */
/** Rótulo SAT aún sin catálogo: ocupa el alto de una línea de texto. */
const SatLabelSkeleton = () => (
  <span role="status" aria-label="Cargando catálogo SAT" className="block">
    <LoadingSkeleton className="h-5 rounded-md!" />
  </span>
);

export const CustomerHeaderTiles = ({ customer }: { customer: Customer }) => {
  const { data: satInfo, isPending: isSatPending } = useSatInfo();
  const regimen = satInfo?.regimenes_fiscales.find(
    (item) => item.id_sat_regimen_fiscal === customer.sat_regimen_fiscal,
  );
  const usoCfdi = satInfo?.usos_cfdi.find((item) => item.id_sat_uso_cfdi === customer.sat_uso_cfdi);

  return (
    <InfoTileGrid>
      <InfoTile label="RFC">{textOrDash(customer.rfc)}</InfoTile>
      <InfoTile label="Régimen fiscal">
        {isSatPending ? <SatLabelSkeleton /> : satCatalogLabel(regimen)}
      </InfoTile>
      <InfoTile label="Uso de CFDI">
        {isSatPending ? <SatLabelSkeleton /> : satCatalogLabel(usoCfdi)}
      </InfoTile>
      <InfoTile label="Teléfono">{textOrDash(customer.telefono)}</InfoTile>
      <InfoTile label="Ciudad / Estado">{formatCustomerUbicacion(customer)}</InfoTile>
      <InfoTile label="Días de crédito">
        <span className="tabular-nums">
          {customer.dias_credito} {plural(customer.dias_credito, "día", "días")}
        </span>
      </InfoTile>
    </InfoTileGrid>
  );
};
