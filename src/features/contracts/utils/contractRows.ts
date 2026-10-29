import type { StaleRowDialogMessages } from "@/src/utils/staleRowDialogNotice";
import type { Contract } from "../interfaces/contract.interface";
import type { ContractRow } from "../components/ContractColumns";
import { getEstadoContratoLabel, getTipoContratoLabel } from "../constants/contractChoices";

/**
 * Filas de la tabla: cada contrato con el nombre de su empleado resuelto. Un
 * FK que no está en el catálogo (o cuyo catálogo no ha llegado) se rotula
 * `Empleado #N`, una sola vez: la celda y la búsqueda leen ese mismo texto
 * (ver `ContractRow`).
 */
export const buildContractRows = (
  contracts: readonly Contract[],
  employeeNameById: ReadonlyMap<number, string>,
): ContractRow[] =>
  contracts.map((contract) => ({
    ...contract,
    empleado_nombre: employeeNameById.get(contract.empleado) ?? `Empleado #${contract.empleado}`,
  }));

/**
 * Texto del `tipo` en la celda (y en la búsqueda y el orden): la etiqueta del
 * catálogo o, si el backend manda un código que el catálogo no conoce, el
 * código crudo — el mismo texto que su opción de filtro. "—" sin valor.
 */
export const getContractTipoText = (tipo: string | null | undefined): string =>
  getTipoContratoLabel(tipo) ?? (tipo || "—");

/**
 * Texto del `estado` de negocio para la búsqueda y el orden: la etiqueta del
 * catálogo o el código crudo. Es lo mismo que pinta su badge (`StatusBadge`
 * cae al código crudo cuando no tiene entrada) y lo que rotula su opción de
 * filtro.
 */
export const getContractEstadoText = (estado: string | null | undefined): string =>
  getEstadoContratoLabel(estado) ?? (estado || "—");

/** Avisos del diálogo de desactivar que se cerró por un cambio externo. */
export const CONTRACT_STALE_MESSAGES: Required<StaleRowDialogMessages> = {
  gone: "El contrato ya no existe. Se actualizó el listado.",
  activoChanged: (activo) =>
    `El registro del contrato cambió: ya está ${activo ? "activo" : "inactivo"}. Se actualizó el listado.`,
};
