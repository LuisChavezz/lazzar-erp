"use client";

import { InfoTile, InfoTileGrid, textOrDash } from "@/src/components/DetailDialogPrimitives";
import { plural } from "@/src/utils/kpiFormat";
import { useSatInfo } from "../../sat/hooks/useSatInfo";
import type { Customer } from "../interfaces/customer.interface";
import { formatCustomerUbicacion, satCatalogLabel } from "../utils/customerHeader";

/**
 * Mosaicos de encabezado del detalle del cliente (mismo molde que
 * `EmployeeDetailContent`). Solo campos que trae también la fila del listado,
 * así que se pintan igual mientras el detalle real llega (placeholder) que
 * después. Régimen fiscal y uso de CFDI se rotulan con el catálogo SAT (en
 * caché 24 h, el mismo del formulario); mientras no llega se ve "—".
 */
export const CustomerHeaderTiles = ({ customer }: { customer: Customer }) => {
  const { data: satInfo } = useSatInfo();
  const regimen = satInfo?.regimenes_fiscales.find(
    (item) => item.id_sat_regimen_fiscal === customer.sat_regimen_fiscal,
  );
  const usoCfdi = satInfo?.usos_cfdi.find((item) => item.id_sat_uso_cfdi === customer.sat_uso_cfdi);

  return (
    <InfoTileGrid>
      <InfoTile label="RFC">{textOrDash(customer.rfc)}</InfoTile>
      <InfoTile label="Régimen fiscal">{satCatalogLabel(regimen)}</InfoTile>
      <InfoTile label="Uso de CFDI">{satCatalogLabel(usoCfdi)}</InfoTile>
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
