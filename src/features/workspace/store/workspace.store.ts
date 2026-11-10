import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { Branch } from "../../branches/interfaces/branch.interface";

/**
 * Sucursal del workspace. La EMPRESA ya no vive aquí (EC-842): sale de la
 * sesión (`useSessionCompany`), que es la única con la que el backend acota los
 * datos desde EC-798. Un store del cliente podía mostrar y mandar una empresa
 * distinta de la que el backend servía.
 */
/** Nombre y RFC para MOSTRAR la empresa de la sesión, ligados a su id. */
export interface CompanyLabel {
  id: number;
  name: string;
  rfc: string | null;
}

interface WorkspaceState {
  selectedBranch: Branch | null;
  /**
   * Nombre de la empresa de la sesión, guardado al resolverlo en `mis-empresas/`
   * para no volver a pedir esa lista en cada carga solo por el nombre. Vale solo
   * mientras su `id` sea el de la sesión (`useSessionCompanyDetails`).
   */
  companyLabel: CompanyLabel | null;
  branchSwitching: boolean;
  hasHydrated: boolean;
  /** Fija la sucursal (`null` = "continuar sin sucursal"). */
  setBranch: (branch: Branch | null) => void;
  setCompanyLabel: (label: CompanyLabel) => void;
  updateBranch: (branch: Branch) => void;
  clearWorkspace: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  devtools(
    persist(
      (set, get) => ({
        selectedBranch: null,
        companyLabel: null,
        branchSwitching: false,
        hasHydrated: false,

        setBranch: (branch) => {
          const prevBranchId = get().selectedBranch?.id;
          const nextBranchId = branch?.id;
          const branchChanged = (!!prevBranchId && !!nextBranchId && (prevBranchId !== nextBranchId)); 

          set({ selectedBranch: branch });
          if (branchChanged) {
            set({ branchSwitching: true });
            setTimeout(() => set({ branchSwitching: false }), 1800);
          }
        },
        
        setCompanyLabel: (companyLabel) => set({ companyLabel }),

        setHasHydrated: (hasHydrated) => set({ hasHydrated }),

        updateBranch: (updatedBranch) => {
          set((state) => ({
            selectedBranch:
              state.selectedBranch?.id == updatedBranch.id
                ? updatedBranch
                : state.selectedBranch,
          }));
        },
        
        clearWorkspace: () =>
          set({ selectedBranch: null, companyLabel: null, branchSwitching: false }),
      }),
      { // Nombre del storage para persistencia
        name: "workspace-storage",
        /* EC-842: v1 dejó de guardar `selectedCompany` (la empresa sale de la
         * sesión) y v2 `availableBranches` (copia de la caché de TanStack Query:
         * las sucursales se leen con `useCompanyBranches(useSessionCompanyId())`).
         * La migración descarta ambas del almacenamiento anterior para que nada
         * vuelva a leerlas. */
        version: 2,
        migrate: (persisted) => {
          const rest = { ...((persisted ?? {}) as Record<string, unknown>) };
          delete rest.selectedCompany;
          delete rest.availableBranches;
          return rest as Partial<WorkspaceState>;
        },
        onRehydrateStorage: () => (state, error) => {
          if (!error) {
            state?.setHasHydrated(true);
          }
        },
      }
    ),
    { // Nombre del store para devtools
      name: "workspace-store",
    }
  )
);
