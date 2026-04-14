'use client'

import Link from "next/link";
import { useMemo, useState } from "react";
import { compareAsc, isSameDay, parseISO } from "date-fns";
import { PlusIcon } from "../../../components/Icons";
import { MainDialog } from "../../../components/MainDialog";
import { DialogHeader } from "../../../components/DialogHeader";
import UpcomingTaskForm from "./UpcomingTaskForm";
import { useUpcomingTasksStore } from "../stores/upcoming-tasks.store";
import { formatTaskTime } from "../utils/formatTaskTime";
import { getTaskStyles } from "../utils/getTaskStyles";

const EmptyUpcomingTasks = () => {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-white/5 px-4 py-5 text-center">
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
        No hay tareas próximas por mostrar
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        Agrega una nueva tarea para verla aquí.
      </p>
    </div>
  );
};

type UpcomingTasksProps = {
  onlyTodayPending?: boolean;
  dialogOpen?: boolean;
  onDialogOpenChange?: (open: boolean) => void;
  defaultCalendarDate?: Date | null;
};

export const UpcomingTasks = ({
  onlyTodayPending = false,
  dialogOpen,
  onDialogOpenChange,
  defaultCalendarDate = null,
}: UpcomingTasksProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const tasks = useUpcomingTasksStore((state) => state.tasks);
  // Soporta modo controlado (desde el panel calendario) y no controlado (uso local).
  const isExternallyControlled = typeof dialogOpen === "boolean";
  const resolvedDialogOpen = isExternallyControlled ? dialogOpen : isDialogOpen;
  const setDialogOpen = (open: boolean) => {
    if (onDialogOpenChange) {
      onDialogOpenChange(open);
      return;
    }
    setIsDialogOpen(open);
  };

  const upcomingTasks = useMemo(() => {
    // La lista oculta tareas vencidas y ordena por fecha ascendente.
    const now = new Date();
    const filteredTasks = tasks
      .map((task) => {
        const parsed = parseISO(task.startDate);
        return { task, parsed };
      })
      .filter((item) => {
        if (Number.isNaN(item.parsed.getTime()) || item.parsed < now) {
          return false;
        }
        if (!onlyTodayPending) {
          return true;
        }
        return isSameDay(item.parsed, now);
      })
      .sort((a, b) => compareAsc(a.parsed, b.parsed));

    // En modo lateral se muestran solo las primeras tareas para mantener el panel compacto.
    if (onlyTodayPending) {
      return filteredTasks;
    }

    return filteredTasks.slice(0, 3);
  }, [onlyTodayPending, tasks]);

  return (
    <section className="bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-slate-800 dark:text-white text-sm">
          {onlyTodayPending ? "Tareas de hoy" : "Próximas Tareas"}
        </h3>
        <button
          type="button"
          aria-label="Agregar tarea"
          className="p-1 cursor-pointer text-slate-400 hover:text-sky-500 transition-colors bg-slate-50 dark:bg-white/5 rounded-md"
          onClick={() => setDialogOpen(true)}
        >
          <PlusIcon className="w-4 h-4" />
        </button>
      </div>

      {upcomingTasks.length === 0 ? (
        <EmptyUpcomingTasks />
      ) : (
        <div className="relative pl-4 border-l border-slate-200 dark:border-slate-800 space-y-6">
          {upcomingTasks.map(({ task, parsed }, index) => {
            const styles = getTaskStyles(index);
            return (
              <div key={task.id} className="relative group">
                <div
                  className={`absolute -left-5.25 top-1 w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-black transition-colors ${styles.dotClassName}`}
                />
                <div className="flex flex-col">
                  <span className={`text-xs font-semibold mb-0.5 ${styles.accentClassName}`}>
                    {formatTaskTime(parsed, { allDay: task.allDay })}
                  </span>
                  <h4 className={`text-sm transition-colors cursor-pointer ${styles.titleClassName}`}>
                    {task.title}
                  </h4>
                  {task.shortDescription ? (
                    <p className="text-xs text-slate-500 mt-1">{task.shortDescription}</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!onlyTodayPending ? (
        <Link
          href="/sales/tasks"
          aria-label="Ver calendario completo"
          className="block w-full text-center cursor-pointer mt-6 py-2 text-xs font-medium text-slate-500 hover:text-sky-600 transition-colors border border-dashed border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5"
        >
          Ver calendario completo
        </Link>
      ) : null}

      <MainDialog
        open={resolvedDialogOpen}
        onOpenChange={setDialogOpen}
        maxWidth="720px"
        title={
          <DialogHeader
            title="Nueva tarea"
            subtitle="Seguimiento CRM y ventas"
            statusColor="sky"
          />
        }
      >
        <UpcomingTaskForm
          onSuccess={() => setDialogOpen(false)}
          defaultCalendarDate={defaultCalendarDate}
          dialogOpen={resolvedDialogOpen}
        />
      </MainDialog>
    </section>
  );
};
