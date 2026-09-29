"use client";

import { Tabs } from "@radix-ui/themes";
import { useAttendanceSearchParams, type AttendanceTab } from "../hooks/useAttendanceSearchParams";
import { RollCallView } from "./RollCallView";
import { AttendanceHistoryView } from "./AttendanceHistoryView";

/**
 * Asistencia: "Pase de lista" (un día, con el checador) e "Historial" (un
 * periodo). La pestaña activa y los filtros de cada una viven en la URL (ver
 * `useAttendanceSearchParams`).
 *
 * `Tabs.Content` de Radix desmonta la pestaña inactiva: solo se consulta la
 * que se ve, y sus diálogos (modales) no pueden quedar abiertos al cambiar.
 */
export function AttendanceView() {
  const { today, tab, fecha, showAll, desde, hasta, setParams } = useAttendanceSearchParams();

  return (
    <Tabs.Root
      value={tab}
      onValueChange={(value) =>
        setParams({ tab: (value as AttendanceTab) === "historial" ? "historial" : null })
      }
    >
      <Tabs.List>
        <Tabs.Trigger value="pase" className="cursor-pointer! text-slate-900! dark:text-white!">
          Pase de lista
        </Tabs.Trigger>
        <Tabs.Trigger value="historial" className="cursor-pointer! text-slate-900! dark:text-white!">
          Historial
        </Tabs.Trigger>
      </Tabs.List>

      <div className="mt-6">
        <Tabs.Content value="pase">
          <RollCallView fecha={fecha} today={today} showAll={showAll} setParams={setParams} />
        </Tabs.Content>
        <Tabs.Content value="historial">
          <AttendanceHistoryView desde={desde} hasta={hasta} setParams={setParams} />
        </Tabs.Content>
      </div>
    </Tabs.Root>
  );
}
