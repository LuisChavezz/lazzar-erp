import type { FiscalAddress } from "../interfaces/fiscal-address.interface";

/**
 * Forma persistida de `sat-storage` (EC-847). La Dirección fiscal es la del
 * emisor, así que va POR EMPRESA: un superusuario que cambia de empresa activa
 * no debe ver la de otra. Sigue viviendo solo en el navegador (no llega al
 * backend).
 */
export interface FiscalAddressStorageState {
  /** Dirección por id de empresa (como texto: es la clave de un objeto JSON). */
  addressesByCompany: Record<string, FiscalAddress>;
  /**
   * La dirección guardada antes de EC-847, cuando era una sola y no se sabía
   * de qué empresa. La migración no puede asignarla (corre al hidratar, antes
   * de tener la sesión); se guarda aquí hasta que la sincronización de la
   * empresa (`SessionCompanySync`) confirme la empresa activa y la reclame
   * para ella (`claimLegacyFiscalAddress`). Nunca se borra sin asignarla.
   */
  legacyAddress: FiscalAddress | null;
}

export const FISCAL_ADDRESS_STORAGE_VERSION = 1;

/** v0 → v1: la dirección única pasa a `legacyAddress`, sin perderla. */
export const migrateFiscalAddressStorage = (
  persisted: unknown,
  version: number
): FiscalAddressStorageState => {
  const state = (persisted ?? {}) as Partial<FiscalAddressStorageState> & {
    fiscalAddress?: FiscalAddress | null;
  };
  if (version < 1) {
    return { addressesByCompany: {}, legacyAddress: state.fiscalAddress ?? null };
  }
  return {
    addressesByCompany: state.addressesByCompany ?? {},
    legacyAddress: state.legacyAddress ?? null,
  };
};

/**
 * Asigna la dirección anterior a EC-847 a `companyId`, la empresa activa que
 * el servidor confirmó en la primera carga tras la migración. Si esa empresa
 * ya tiene una dirección propia no la pisa y conserva la anterior para no
 * perderla. Devuelve el mismo objeto si no hay nada que hacer.
 */
export const claimLegacyFiscalAddressState = (
  state: FiscalAddressStorageState,
  companyId: number
): FiscalAddressStorageState => {
  const key = String(companyId);
  if (!state.legacyAddress || state.addressesByCompany[key]) return state;
  return {
    addressesByCompany: { ...state.addressesByCompany, [key]: state.legacyAddress },
    legacyAddress: null,
  };
};

/** Dirección de `companyId`, o `null` sin empresa o sin dirección. */
export const fiscalAddressForCompany = (
  addressesByCompany: Record<string, FiscalAddress>,
  companyId: number | null
): FiscalAddress | null => (companyId === null ? null : addressesByCompany[String(companyId)] ?? null);
