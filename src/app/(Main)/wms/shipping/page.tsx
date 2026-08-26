import { ShippingView } from "@/src/features/shipping/components/ShippingView";

export default function ShippingPage() {
  return (
    <div className="w-full space-y-8">
      <div>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Entrega de cajas empacadas al transportista.
        </p>
      </div>

      <ShippingView />
    </div>
  );
}
