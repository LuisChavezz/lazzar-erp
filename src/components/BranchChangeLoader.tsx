"use client";

import { useEffect, useState } from "react";
import { useWorkspaceStore } from "@/src/features/workspace/store/workspace.store";
import { Loader } from "./Loader";

export default function BranchChangeLoader({ children }: { children: React.ReactNode }) {
  const branchSwitching = useWorkspaceStore((s) => s.branchSwitching);

  // El loader sólo debe aparecer ante un cambio de sucursal iniciado por el
  // usuario DURANTE esta sesión. Desde EC-847 el store ya no persiste
  // `branchSwitching` (`partialize`, v3): antes una recarga dentro de los
  // 1800ms del cambio lo dejaba guardado en `true` y el loader quedaba atorado.
  //
  // `armed` arranca en `false` en SSR y en el primer render del cliente, de modo
  // que SIEMPRE se pinta `children` primero (FCP seguro, sin desajuste de
  // hidratación frente al SSR, que siempre parte de `false`). Tras montar, sólo
  // habilitamos el loader si no hay un cambio en curso.
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
