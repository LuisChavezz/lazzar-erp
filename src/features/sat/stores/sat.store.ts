import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";
import { FiscalAddress } from "../interfaces/fiscal-address.interface";

interface SatState {
  fiscalAddress: FiscalAddress | null;
  setFiscalAddress: (address: FiscalAddress) => void;
}

export const useSatStore = create<SatState>()(
  devtools(
    persist(
      (set) => ({
        fiscalAddress: null,
        setFiscalAddress: (address) => set({ fiscalAddress: address }),
      }),
      {
        name: "sat-storage",
      }
    ),
    {
      name: "SAT Store",
    }
  )
);
