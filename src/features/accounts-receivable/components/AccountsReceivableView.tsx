"use client";

import { useBackendToday } from "@/src/hooks/useBackendToday";
import { AccountsReceivableStats } from "./AccountsReceivableStats";
import { AccountsReceivableList } from "./AccountsReceivableList";

/**
 * Pantalla de CxC: calcula HOY (el día del backend, `useBackendToday`) UNA sola
 * vez y lo comparte entre los indicadores, la tabla, la antigüedad y el detalle,
 * así que todos cambian de día en el mismo render.
 */
export function AccountsReceivableView() {
  const today = useBackendToday();

  return (
    <>
      <AccountsReceivableStats today={today} />

      <div className="space-y-6">
        <AccountsReceivableList today={today} />
      </div>
    </>
  );
}
