import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { Company } from "../../companies/interfaces/company.interface";
import { Branch } from "../../branches/interfaces/branch.interface";


interface WorkspaceState {
  selectedCompany: Partial<Company>;
  selectedBranch: Branch | null;
  availableBranches: Branch[];
  branchSwitching: boolean;
  setWorkspace: (company: Partial<Company>, branch?: Branch) => void;
  setAvailableBranches: (branches: Branch[]) => void;
  updateBranch: (branch: Branch) => void;
  clearWorkspace: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  devtools(
    persist(
      (set, get) => ({
        selectedCompany: {},
        selectedBranch: null,
        availableBranches: [],
        branchSwitching: false,

        setWorkspace: (company, branch) => {
          const prevBranchId = get().selectedBranch?.id;
          const nextBranchId = branch?.id;
          const branchChanged = (!!prevBranchId && !!nextBranchId && (prevBranchId !== nextBranchId)); 

          set({ selectedCompany: company, selectedBranch: branch || null });
          if (branchChanged) {
            set({ branchSwitching: true });
            setTimeout(() => set({ branchSwitching: false }), 1800);
          }
        },
        
        setAvailableBranches: (branches) =>
          set({ availableBranches: branches }),

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
          set({ selectedCompany: {}, selectedBranch: null, availableBranches: [], branchSwitching: false }),
      }),
      { // Nombre del storage para persistencia
        name: "workspace-storage",
      }
    ),
    { // Nombre del store para devtools
      name: "workspace-store",
    }
  )
);
