 "use client";
 
 import { useWorkspaceStore } from "@/src/features/workspace/store/workspace.store";
 import { Loader } from "./Loader";
 
 export default function BranchChangeLoader({ children }: { children: React.ReactNode }) {
   const loading = useWorkspaceStore((s) => s.branchSwitching);
 
   if (loading) {
     return (
       <div className="flex w-full h-full items-center justify-center">
        <Loader
          title="Cargando"
          message="Aplicando configuración y datos de la sucursal seleccionada..."
        />
       </div>
     );
   }
 
   return <>{children}</>;
 }
