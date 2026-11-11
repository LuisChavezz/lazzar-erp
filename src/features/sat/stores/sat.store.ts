import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";
import { FiscalAddress } from "../interfaces/fiscal-address.interface";
import {
  claimLegacyFiscalAddressState,
  FISCAL_ADDRESS_STORAGE_VERSION,
  migrateFiscalAddressStorage,
  type FiscalAddressStorageState,
} from "../utils/fiscalAddressStorage";

interface SatState extends FiscalAddressStorageState {
  setFiscalAddress: (companyId: number, address: FiscalAddress) => void;
  claimLegacyAddress: (companyId: number) => void;
}

/** Dirección fiscal por empresa (EC-847); ver `fiscalAddressStorage`. */
export const useSatStore = create<SatState>()(
  devtools(
    persist(
      (set, get) => ({
        addressesByCompany: {},
        legacyAddress: null,
        setFiscalAddress: (companyId, address) =>
          set((state) => ({
            addressesByCompany: { ...state.addressesByCompany, [String(companyId)]: address },
          })),
        claimLegacyAddress: (companyId) => {
          const { addressesByCompany, legacyAddress } = get();
          const current = { addressesByCompany, legacyAddress };
          const next = claimLegacyFiscalAddressState(current, companyId);
          if (next !== current) set(next);
        },
      }),
      {
        name: "sat-storage",
        version: FISCAL_ADDRESS_STORAGE_VERSION,
        migrate: (persisted, version) => migrateFiscalAddressStorage(persisted, version),
        partialize: ({ addressesByCompany, legacyAddress }) => ({ addressesByCompany, legacyAddress }),
      }
    ),
    {
      name: "SAT Store",
    }
  )
);

/**
 * Reclama la dirección anterior a EC-847 para la empresa activa que el
 * servidor acaba de confirmar. La llama `SessionCompanySync` en cada
 * confirmación; solo la primera con dirección pendiente hace algo. Nunca
 * lanza: un fallo de almacenamiento no debe tumbar la sincronización.
 */
export const claimLegacyFiscalAddress = (companyId: number) => {
  try {
    useSatStore.getState().claimLegacyAddress(companyId);
  } catch {
    // Se reintenta en la siguiente confirmación.
  }
};
