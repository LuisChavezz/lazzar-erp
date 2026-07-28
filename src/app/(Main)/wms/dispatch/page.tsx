import { DispatchView } from "@/src/features/dispatch/components/DispatchView";

export default function DispatchPage() {
  return (
    <div className="w-full space-y-8">
      <div>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Entrega de cajas empacadas al transportista para su envío.
        </p>
      </div>

      <DispatchView />
    </div>
  );
}
