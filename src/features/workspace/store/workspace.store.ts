import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { Branch, Company } from "../../companies/interfaces/company.interface";


interface WorkspaceState {
  selectedCompany: Partial<Company>;
  selectedBranch: Branch | null;
  setWorkspace: (company: Partial<Company>, branch?: Branch) => void;
  clearWorkspace: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  devtools(
    persist(
      (set) => ({
        selectedCompany: {},
        selectedBranch: null,

        setWorkspace: (company, branch) => 
          set({ selectedCompany: company, selectedBranch: branch || null }),
        
        clearWorkspace: () => 
          set({ selectedCompany: {}, selectedBranch: null }),
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
