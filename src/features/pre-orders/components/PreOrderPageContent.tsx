"use client";

import Link from "next/link";
import { ArrowLeftIcon } from "@/src/components/Icons";
import { BACK_ARROW_CLASS, BACK_BUTTON_CLASS } from "@/src/components/backButtonClass";
import { WorkOrderTopBar } from "@/src/components/WorkOrderSheets";
import { PreOrderSheet } from "./PreOrderSheet";

/** Página de una pre-orden: la misma hoja que se ve en fabricación especial. */
export function PreOrderPageContent({ preOrderId }: { preOrderId: string }) {
  const id = Number(preOrderId);
  const valid = Number.isInteger(id) && id > 0;

  return (
    <div className="space-y-6">
      <WorkOrderTopBar
        backLink={
          <Link href="/manufacturing/pre-orders" className={BACK_BUTTON_CLASS}>
            <ArrowLeftIcon className={BACK_ARROW_CLASS} />
            Volver a Pre-órdenes
          </Link>
        }
      />
      {valid ? (
        <PreOrderSheet preOrderId={id} />
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">La pre-orden no está disponible.</p>
      )}
    </div>
  );
}
