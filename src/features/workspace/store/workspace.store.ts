import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { Branch } from "../../branches/interfaces/branch.interface";

/**
 * Sucursal del workspace. La EMPRESA ya no vive aquí (EC-842): sale de la
 * sesión (`useSessionCompany`), que es la única con la que el backend acota los
 * datos desde EC-798. Un store del cliente podía mostrar y mandar una empresa
 * distinta de la que el backend servía.
 */
interface WorkspaceState {
  selectedBranch: Branch | null;
  availableBranches: Branch[];
  branchSwitching: boolean;
  hasHydrated: boolean;
  /** Fija la sucursal (`null` = "continuar sin sucursal"). */
  setBranch: (branch: Branch | null) => void;
  setAvailableBranches: (branches: Branch[]) => void;
  updateBranch: (branch: Branch) => void;
  clearWorkspace: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  devtools(
    persist(
      (set, get) => ({
        selectedBranch: null,
        availableBranches: [],
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
        
        setAvailableBranches: (branches) =>
          set({ availableBranches: branches }),

        setHasHydrated: (hasHydrated) => set({ hasHydrated }),

        updateBranch: (updatedBranch) => {
          set((state) => ({
            availableBranches: state.availableBranches.map((b) =>
              b.id == updatedBranch.id ? updatedBranch : b
            ),
            selectedBranch:
              state.selectedBranch?.id == updatedBranch.id
                ? updatedBranch
                : state.selectedBranch,
          }));
        },
        
        clearWorkspace: () =>
          set({ selectedBranch: null, availableBranches: [], branchSwitching: false }),
      }),
      { // Nombre del storage para persistencia
        name: "workspace-storage",
        /* v1 (EC-842): se dejó de guardar `selectedCompany`. La migración la
         * descarta del almacenamiento de versiones anteriores para que nada
         * vuelva a leerla. */
        version: 1,
        migrate: (persisted) => {
          const rest = { ...((persisted ?? {}) as Record<string, unknown>) };
          delete rest.selectedCompany;
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
