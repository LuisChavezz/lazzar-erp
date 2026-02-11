import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { Company } from "../../companies/interfaces/company.interface";
import { Branch } from "../../branches/interfaces/branch.interface";


interface WorkspaceState {
  selectedCompany: Partial<Company>;
  selectedBranch: Branch | null;
  availableBranches: Branch[];
  setWorkspace: (company: Partial<Company>, branch?: Branch) => void;
  setAvailableBranches: (branches: Branch[]) => void;
  updateBranch: (branch: Branch) => void;
  clearWorkspace: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  devtools(
    persist(
      (set) => ({
        selectedCompany: {},
        selectedBranch: null,
        availableBranches: [],

        setWorkspace: (company, branch) => 
          set({ selectedCompany: company, selectedBranch: branch || null }),
        
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
          set({ selectedCompany: {}, selectedBranch: null, availableBranches: [] }),
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
