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
