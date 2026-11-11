import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";
import { FiscalAddress } from "../interfaces/fiscal-address.interface";
import { rehydrateOnStorageWrites } from "@/src/stores/rehydrateOnStorageWrites";
import {
  claimLegacyFiscalAddressState,
  FISCAL_ADDRESS_STORAGE_VERSION,
  migrateFiscalAddressStorage,
  parseStoredFiscalAddressState,
  withFiscalAddressForCompany,
  type FiscalAddressStorageState,
} from "../utils/fiscalAddressStorage";

const SAT_STORAGE_KEY = "sat-storage";

/**
 * Estado guardado AHORA en `localStorage`, ya migrado; `null` si no hay o no se
 * puede leer. Las escrituras parten de él y no del estado en memoria: otra
 * pestaña pudo guardar la dirección de otra empresa después de la última
 * relectura de esta, y escribir el mapa en memoria la borraría.
 */
const readStoredState = (): FiscalAddressStorageState | null => {
  try {
    if (typeof window === "undefined") return null;
    return parseStoredFiscalAddressState(window.localStorage.getItem(SAT_STORAGE_KEY));
  } catch {
    return null;
  }
};

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
        setFiscalAddress: (companyId, address) => {
          const { addressesByCompany, legacyAddress } = get();
          const base = readStoredState() ?? { addressesByCompany, legacyAddress };
          set(withFiscalAddressForCompany(base, companyId, address));
        },
        claimLegacyAddress: (companyId) => {
          const { addressesByCompany, legacyAddress } = get();
          const base = readStoredState() ?? { addressesByCompany, legacyAddress };
          const next = claimLegacyFiscalAddressState(base, companyId);
          if (next !== base) set(next);
        },
      }),
      {
        name: SAT_STORAGE_KEY,
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

// Lo que otra pestaña guarda (la dirección de otra empresa, el reclamo de la
// anterior) llega a esta en vez de que su estado en memoria lo deshaga.
rehydrateOnStorageWrites(useSatStore.persist, SAT_STORAGE_KEY);

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
