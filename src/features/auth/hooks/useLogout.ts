import { signOut } from "next-auth/react";
import { useWorkspaceStore } from "@/src/features/workspace/store/workspace.store";

export const useLogout = () => {
  const { clearWorkspace } = useWorkspaceStore();

  const handleLogout = async () => {
    // Limpiar el store de workspace
    clearWorkspace();
    
    // Limpiar la cookie de workspace
    document.cookie = "erp_workspace_id=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    
    await signOut({ callbackUrl: "/auth/login" });
  };

  return {
    handleLogout,
  };
};
