"use client";

import { useEffect, useState } from "react";
import { useWorkspaceStore } from "@/src/features/workspace/store/workspace.store";
import { Loader } from "./Loader";

export default function BranchChangeLoader({ children }: { children: React.ReactNode }) {
  const branchSwitching = useWorkspaceStore((s) => s.branchSwitching);

  // El loader sólo debe aparecer ante un cambio de sucursal iniciado por el
  // usuario DURANTE esta sesión. El store de workspace persiste en localStorage
  // sin `partialize`, por lo que `branchSwitching` puede rehidratarse en `true`
  // (p. ej. si la pestaña se cerró dentro de la ventana de 1800ms del cambio).
  // Como la rehidratación de Zustand con localStorage es síncrona, ese valor
  // obsoleto estaría presente ya en el primer render del cliente y bloquearía
  // el contenido del home — degradando FCP/LCP y provocando un desajuste de
  // hidratación frente al SSR (que siempre parte de `false`).
  //
  // `armed` arranca en `false` en SSR y en el primer render del cliente, de modo
  // que SIEMPRE se pinta `children` primero (FCP seguro, sin mismatch). Tras
  // montar, sólo habilitamos el loader si no hay un cambio en curso; un `true`
  // rehidratado queda ignorado hasta que el estado vuelva a `false`.
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!branchSwitching) setArmed(true);
  }, [branchSwitching]);

  if (armed && branchSwitching) {
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
